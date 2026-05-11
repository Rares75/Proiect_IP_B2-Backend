/// <reference types="bun-types" />
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	spyOn,
} from "bun:test";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { count, eq, inArray, sql } from "drizzle-orm";
import app, { websocket } from "../../src/app";
import auth from "../../src/auth";
import { db } from "../../src/db";
import { user } from "../../src/db/auth-schema";
import { volunteers } from "../../src/db/profile";
import { helpRequests, taskAssignments } from "../../src/db/requests";
import { conversations, messages } from "../../src/db/social";
import { loadControllers } from "../../src/utils/controller";

type SeededTask = {
	taskId: number;
	conversationId: number;
	ownerUserId: string | null;
	volunteerUserId: string;
	guestSessionId: string | null;
};

type WsEnvelope =
	| {
			type: "NEW_MESSAGE";
			data: {
				id: number;
				senderId: string;
				type: string;
				content: string | null;
				audioUrl: string | null;
				createdAt: string;
			};
	  }
	| {
			type: "ERROR";
			data: {
				message: string;
			};
	  };

describe("GET /api/tasks/:id/ws integration", () => {
	let server: Bun.Server<unknown> | undefined;
	let baseHttpUrl = "";
	let baseWsUrl = "";
	let authSpy: ReturnType<typeof spyOn> | undefined;
	let isDatabaseAvailable = true;
	const createdTaskIds: number[] = [];
	const createdVolunteerIds: number[] = [];
	const createdUserIds: string[] = [];

	beforeAll(async () => {
		const controllersPath = join(
			(import.meta as any).dir,
			"../../src/controllers",
		);
		await loadControllers(controllersPath);

		try {
			const result = await db.execute(
				sql`select to_regclass('public.user') as user_table`,
			);
			isDatabaseAvailable = Boolean((result as any)[0]?.user_table);
		} catch {
			isDatabaseAvailable = false;
		}

		server = Bun.serve({
			port: 0,
			hostname: "127.0.0.1",
			fetch: (request, currentServer) => app.fetch(request, { server: currentServer }),
			websocket,
		});

		baseHttpUrl = `http://${server.hostname}:${server.port}/api`;
		baseWsUrl = `ws://${server.hostname}:${server.port}/api`;
	});

	beforeEach(() => {
		authSpy = spyOn(auth.api, "getSession").mockImplementation(
			(async ({ headers }: { headers: Headers | HeadersInit }) => {
				const cookieHeader =
					headers instanceof Headers
						? headers.get("cookie")
						: new Headers(headers).get("cookie");

				if (!cookieHeader) {
					return null as any;
				}

				const matched = /test-session=([^;]+)/.exec(cookieHeader);
				const userId = matched?.[1];
				if (!userId) {
					return null as any;
				}

				return {
					user: { id: userId, email: `${userId}@test.local` } as any,
					session: { id: `session-${userId}`, userId } as any,
				};
			}) as any,
		);
	});

	afterEach(async () => {
		authSpy?.mockRestore();
		authSpy = undefined;

		if (!isDatabaseAvailable) {
			createdTaskIds.length = 0;
			createdVolunteerIds.length = 0;
			createdUserIds.length = 0;
			return;
		}

		if (createdTaskIds.length > 0) {
			await db.delete(helpRequests).where(inArray(helpRequests.id, createdTaskIds));
		}

		if (createdVolunteerIds.length > 0) {
			await db.delete(volunteers).where(inArray(volunteers.id, createdVolunteerIds));
		}

		if (createdUserIds.length > 0) {
			await db.delete(user).where(inArray(user.id, createdUserIds));
		}

		createdTaskIds.length = 0;
		createdVolunteerIds.length = 0;
		createdUserIds.length = 0;
	});

	afterAll(() => {
		server?.stop(true);
	});

	const insertUser = async (id: string) => {
		await db.execute(sql`
			insert into "user" ("id", "name", "email", "email_verified", "updated_at")
			values (${id}, ${id}, ${`${id}@test.local`}, true, now())
			on conflict ("id") do nothing
		`);
		createdUserIds.push(id);
	};

	const insertVolunteer = async (userId: string) => {
		const [created] = await db
			.insert(volunteers)
			.values({
				userId,
				availability: true,
			})
			.returning({ id: volunteers.id });

		createdVolunteerIds.push(created.id);
		return created.id;
	};

	const seedConversationTask = async (params: {
		ownerUserId: string | null;
		volunteerUserId: string;
		taskStatus: "MATCHED" | "IN_PROGRESS" | "OPEN" | "COMPLETED";
		guestSessionId?: string | null;
	}) => {
		if (params.ownerUserId) {
			await insertUser(params.ownerUserId);
		}
		await insertUser(params.volunteerUserId);

		const volunteerId = await insertVolunteer(params.volunteerUserId);
		const [task] = await db
			.insert(helpRequests)
			.values({
				requestedByUserId: params.ownerUserId,
				guestSessionId: params.guestSessionId ?? null,
				title: `ws-task-${randomUUID()}`,
				description: "Realtime chat integration task",
				status: params.taskStatus,
				category: "MESSAGES_ONLY",
				anonymousMode: params.ownerUserId ? false : true,
			})
			.returning({ id: helpRequests.id });
		createdTaskIds.push(task.id);

		const [assignment] = await db
			.insert(taskAssignments)
			.values({
				helpRequestId: task.id,
				offerId: null,
				requestedByUserId: params.ownerUserId,
				handledByVolunteerId: volunteerId,
				status: "ASSIGNED",
			})
			.returning({ id: taskAssignments.id });

		const [conversation] = await db
			.insert(conversations)
			.values({
				taskAssignmentId: assignment.id,
				status: "OPEN",
			})
			.returning({ id: conversations.id });

		return {
			taskId: task.id,
			conversationId: conversation.id,
			ownerUserId: params.ownerUserId,
			volunteerUserId: params.volunteerUserId,
			guestSessionId: params.guestSessionId ?? null,
		} satisfies SeededTask;
	};

	const connectSocket = async (url: string, cookieUserId?: string) => {
		const ws = new WebSocket(url, {
			headers: cookieUserId
				? {
						Cookie: `test-session=${cookieUserId}`,
					}
				: undefined,
		});

		await new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(new Error(`Timed out while opening socket: ${url}`));
			}, 5000);

			ws.addEventListener(
				"open",
				() => {
					clearTimeout(timeout);
					resolve();
				},
				{ once: true },
			);

			ws.addEventListener(
				"error",
				() => {
					clearTimeout(timeout);
					reject(new Error(`Socket failed to open: ${url}`));
				},
				{ once: true },
			);
		});

		return ws;
	};

	const waitForWsMessage = async (socket: WebSocket) => {
		return await new Promise<WsEnvelope>((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(new Error("Timed out waiting for websocket message"));
			}, 5000);

			socket.addEventListener(
				"message",
				(event) => {
					clearTimeout(timeout);
					resolve(JSON.parse(String(event.data)) as WsEnvelope);
				},
				{ once: true },
			);
		});
	};

	const closeSocket = async (socket: WebSocket) => {
		if (
			socket.readyState === WebSocket.CLOSING ||
			socket.readyState === WebSocket.CLOSED
		) {
			return;
		}

		await new Promise<void>((resolve) => {
			socket.addEventListener("close", () => resolve(), { once: true });
			socket.close();
		});
	};

	const countConversationMessages = async (conversationId: number) => {
		const [result] = await db
			.select({ total: count() })
			.from(messages)
			.where(eq(messages.conversationId, conversationId));

		return Number(result?.total ?? 0);
	};

	const waitForMessageCount = async (
		conversationId: number,
		expectedCount: number,
	) => {
		const deadline = Date.now() + 5000;

		while (Date.now() < deadline) {
			if ((await countConversationMessages(conversationId)) === expectedCount) {
				return;
			}

			await Bun.sleep(50);
		}

		throw new Error(
			`Timed out waiting for ${expectedCount} messages in conversation ${conversationId}`,
		);
	};

	it("delivers TEXTCONTENT from auth owner to volunteer, validates body errors, and persists the message", async () => {
		if (!isDatabaseAvailable) {
			return;
		}

		const task = await seedConversationTask({
			ownerUserId: `ws-owner-${randomUUID()}`,
			volunteerUserId: `ws-volunteer-${randomUUID()}`,
			taskStatus: "MATCHED",
		});

		const ownerSocket = await connectSocket(
			`${baseWsUrl}/tasks/${task.taskId}/ws`,
			task.ownerUserId as string,
		);
		const volunteerSocket = await connectSocket(
			`${baseWsUrl}/tasks/${task.taskId}/ws`,
			task.volunteerUserId,
		);

		try {
			ownerSocket.send("not-json");
			const invalidPayload = await waitForWsMessage(ownerSocket);
			expect(invalidPayload).toEqual({
				type: "ERROR",
				data: {
					message: "Invalid websocket message payload",
				},
			});

			ownerSocket.send(
				JSON.stringify({
					type: "SEND_MESSAGE",
					data: {
						type: "TEXTCONTENT",
						content: "Salut din owner",
					},
				}),
			);

			const delivered = await waitForWsMessage(volunteerSocket);
			expect(delivered.type).toBe("NEW_MESSAGE");
			if (delivered.type === "NEW_MESSAGE") {
				expect(delivered.data.senderId).toBe(task.ownerUserId as string);
				expect(delivered.data.type).toBe("TEXTCONTENT");
				expect(delivered.data.content).toBe("Salut din owner");
				expect(delivered.data.audioUrl).toBeNull();
			}

			const savedMessages = await db
				.select()
				.from(messages)
				.where(eq(messages.conversationId, task.conversationId));
			expect(savedMessages).toHaveLength(1);
			expect(savedMessages[0].senderId).toBe(task.ownerUserId as string);
			expect(savedMessages[0].content).toBe("Salut din owner");
			expect(savedMessages[0].audioUrl).toBeNull();
		} finally {
			await closeSocket(ownerSocket);
			await closeSocket(volunteerSocket);
		}
	});

	it("establishes a guest websocket and delivers AUDIOCONTENT from volunteer in real time", async () => {
		if (!isDatabaseAvailable) {
			return;
		}

		const task = await seedConversationTask({
			ownerUserId: null,
			volunteerUserId: `ws-volunteer-${randomUUID()}`,
			taskStatus: "IN_PROGRESS",
			guestSessionId: randomUUID(),
		});

		const guestSocket = await connectSocket(
			`${baseWsUrl}/tasks/${task.taskId}/ws?guestSession=${task.guestSessionId}`,
		);
		const volunteerSocket = await connectSocket(
			`${baseWsUrl}/tasks/${task.taskId}/ws`,
			task.volunteerUserId,
		);

		try {
			volunteerSocket.send(
				JSON.stringify({
					type: "SEND_MESSAGE",
					data: {
						type: "AUDIOCONTENT",
						audioUrl: "https://cdn.example.com/audio-message.webm",
					},
				}),
			);

			const delivered = await waitForWsMessage(guestSocket);
			expect(delivered.type).toBe("NEW_MESSAGE");
			if (delivered.type === "NEW_MESSAGE") {
				expect(delivered.data.senderId).toBe(task.volunteerUserId);
				expect(delivered.data.type).toBe("AUDIOCONTENT");
				expect(delivered.data.content).toBeNull();
				expect(delivered.data.audioUrl).toBe(
					"https://cdn.example.com/audio-message.webm",
				);
			}

			const savedMessages = await db
				.select()
				.from(messages)
				.where(eq(messages.conversationId, task.conversationId));
			expect(savedMessages).toHaveLength(1);
			expect(savedMessages[0].senderId).toBe(task.volunteerUserId);
			expect(savedMessages[0].audioUrl).toBe(
				"https://cdn.example.com/audio-message.webm",
			);
		} finally {
			await closeSocket(guestSocket);
			await closeSocket(volunteerSocket);
		}
	});

	it("delivers TEXTCONTENT from guest owner to volunteer and persists it with null senderId", async () => {
		if (!isDatabaseAvailable) {
			return;
		}

		const task = await seedConversationTask({
			ownerUserId: null,
			volunteerUserId: `ws-volunteer-${randomUUID()}`,
			taskStatus: "MATCHED",
			guestSessionId: randomUUID(),
		});

		const guestSocket = await connectSocket(
			`${baseWsUrl}/tasks/${task.taskId}/ws?guestSession=${task.guestSessionId}`,
		);
		const volunteerSocket = await connectSocket(
			`${baseWsUrl}/tasks/${task.taskId}/ws`,
			task.volunteerUserId,
		);

		try {
			guestSocket.send(
				JSON.stringify({
					type: "SEND_MESSAGE",
					data: {
						type: "TEXTCONTENT",
						content: "Salut, sunt guest-ul",
					},
				}),
			);

			const delivered = await waitForWsMessage(volunteerSocket);
			expect(delivered.type).toBe("NEW_MESSAGE");
			if (delivered.type === "NEW_MESSAGE") {
				expect(delivered.data.senderId).toBeNull();
				expect(delivered.data.type).toBe("TEXTCONTENT");
				expect(delivered.data.content).toBe("Salut, sunt guest-ul");
				expect(delivered.data.audioUrl).toBeNull();
			}

			const savedMessages = await db
				.select()
				.from(messages)
				.where(eq(messages.conversationId, task.conversationId));
			expect(savedMessages).toHaveLength(1);
			expect(savedMessages[0].senderId).toBeNull();
			expect(savedMessages[0].guestSessionId).toBe(task.guestSessionId);
			expect(savedMessages[0].content).toBe("Salut, sunt guest-ul");
		} finally {
			await closeSocket(guestSocket);
			await closeSocket(volunteerSocket);
		}
	});

	it("returns ERROR and does not insert a message when the task status is invalid", async () => {
		if (!isDatabaseAvailable) {
			return;
		}

		const task = await seedConversationTask({
			ownerUserId: `ws-owner-${randomUUID()}`,
			volunteerUserId: `ws-volunteer-${randomUUID()}`,
			taskStatus: "COMPLETED",
		});

		const ownerSocket = await connectSocket(
			`${baseWsUrl}/tasks/${task.taskId}/ws`,
			task.ownerUserId as string,
		);

		try {
			ownerSocket.send(
				JSON.stringify({
					type: "SEND_MESSAGE",
					data: {
						type: "TEXTCONTENT",
						content: "Nu ar trebui salvat",
					},
				}),
			);

			const errorMessage = await waitForWsMessage(ownerSocket);
			expect(errorMessage).toEqual({
				type: "ERROR",
				data: {
					message: "Task status must be MATCHED or IN_PROGRESS",
				},
			});

			expect(await countConversationMessages(task.conversationId)).toBe(0);
		} finally {
			await closeSocket(ownerSocket);
		}
	});

	it("keeps the message in DB without a peer connection and GET /messages returns it after reconnect", async () => {
		if (!isDatabaseAvailable) {
			return;
		}

		const task = await seedConversationTask({
			ownerUserId: `ws-owner-${randomUUID()}`,
			volunteerUserId: `ws-volunteer-${randomUUID()}`,
			taskStatus: "MATCHED",
		});

		const ownerSocket = await connectSocket(
			`${baseWsUrl}/tasks/${task.taskId}/ws`,
			task.ownerUserId as string,
		);

		try {
			ownerSocket.send(
				JSON.stringify({
					type: "SEND_MESSAGE",
					data: {
						type: "TEXTCONTENT",
						content: "Persista chiar fara peer",
					},
				}),
			);

			await waitForMessageCount(task.conversationId, 1);

			expect(await countConversationMessages(task.conversationId)).toBe(1);
		} finally {
			await closeSocket(ownerSocket);
		}

		const reconnectedOwner = await connectSocket(
			`${baseWsUrl}/tasks/${task.taskId}/ws`,
			task.ownerUserId as string,
		);

		try {
			const response = await fetch(
				`${baseHttpUrl}/tasks/${task.taskId}/messages?page=1&pageSize=20`,
				{
					headers: {
						Cookie: `test-session=${task.ownerUserId}`,
					},
				},
			);
			const body = (await response.json()) as any;

			expect(response.status).toBe(200);
			expect(body.data.data).toHaveLength(1);
			expect(body.data.data[0]).toMatchObject({
				senderId: task.ownerUserId,
				type: "TEXTCONTENT",
				content: "Persista chiar fara peer",
				audioUrl: null,
			});
		} finally {
			await closeSocket(reconnectedOwner);
		}
	});

	it("returns guest-sent history over HTTP with senderId null for the guest owner", async () => {
		if (!isDatabaseAvailable) {
			return;
		}

		const task = await seedConversationTask({
			ownerUserId: null,
			volunteerUserId: `ws-volunteer-${randomUUID()}`,
			taskStatus: "IN_PROGRESS",
			guestSessionId: randomUUID(),
		});

		const guestSocket = await connectSocket(
			`${baseWsUrl}/tasks/${task.taskId}/ws?guestSession=${task.guestSessionId}`,
		);

		try {
			guestSocket.send(
				JSON.stringify({
					type: "SEND_MESSAGE",
					data: {
						type: "TEXTCONTENT",
						content: "Istoric guest",
					},
				}),
			);

			await waitForMessageCount(task.conversationId, 1);
		} finally {
			await closeSocket(guestSocket);
		}

		const response = await fetch(
			`${baseHttpUrl}/tasks/${task.taskId}/messages?page=1&pageSize=20`,
			{
				headers: {
					"X-Guest-Session": task.guestSessionId as string,
				},
			},
		);
		const body = (await response.json()) as any;

		expect(response.status).toBe(200);
		expect(body.data.data).toHaveLength(1);
		expect(body.data.data[0]).toMatchObject({
			senderId: null,
			type: "TEXTCONTENT",
			content: "Istoric guest",
			audioUrl: null,
		});
	});
});
