/// <reference types="bun-types" />
import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	spyOn,
} from "bun:test";
import { join } from "node:path";
import app from "../../../src/app";
import auth from "../../../src/auth";
import { db } from "../../../src/db";
import { helpRequests, requestLocations } from "../../../src/db/requests";
import { loadControllers } from "../../../src/utils/controller";
import { inArray } from "drizzle-orm";

describe("GET /api/tasks category filter integration", () => {
	let authSpy: ReturnType<typeof spyOn> | undefined;
	let createdTaskIds: number[] = [];
	let isDatabaseAvailable = true;

	beforeAll(async () => {
		const controllersPath = join(
			(import.meta as any).dir,
			"../../../src/controllers",
		);
		await loadControllers(controllersPath);

		try {
			await db.execute(/*sql*/ `select 1`);
		} catch {
			isDatabaseAvailable = false;
		}
	});

	beforeEach(() => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "category-filter-user", email: "cat@test.com" } as any,
			session: { id: "session-cat", userId: "category-filter-user" } as any,
		});
	});

	afterEach(async () => {
		if (createdTaskIds.length > 0) {
			await db
				.delete(requestLocations)
				.where(inArray(requestLocations.helpRequestId, createdTaskIds));
			await db
				.delete(helpRequests)
				.where(inArray(helpRequests.id, createdTaskIds));
		}
		createdTaskIds = [];
		authSpy?.mockRestore();
		authSpy = undefined;
	});

	const createTask = async (
		title: string,
		category: "FACE_TO_FACE" | "MESSAGES_ONLY",
		location?: { x: number; y: number },
		city?: string,
	) => {
		const [task] = await db
			.insert(helpRequests)
			.values({
				title,
				description: `${title} description`,
				category,
				status: "OPEN",
			})
			.returning({ id: helpRequests.id });

		createdTaskIds.push(task.id);

		if (location) {
			await db
				.insert(requestLocations)
				.values({ helpRequestId: task.id, city: city ?? title, location });
		}

		return task.id;
	};

	it("returns only MESSAGES_ONLY tasks when category=MESSAGES_ONLY", async () => {
		if (!isDatabaseAvailable) return;

		const faceId = await createTask("FaceTask", "FACE_TO_FACE", {
			x: 27.58,
			y: 47.15,
		});
		const msg1 = await createTask("MsgTask1", "MESSAGES_ONLY");
		const msg2 = await createTask("MsgTask2", "MESSAGES_ONLY", {
			x: 27.8,
			y: 47.3,
		});

		const res = await app.request("/api/tasks?category=MESSAGES_ONLY", {
			headers: { Authorization: "Bearer fake-test-token" },
		});
		const body: any = await res.json();

		expect(res.status).toBe(200);
		const returnedIds = body.data.data.map((t: any) => t.id);
		expect(returnedIds).toContain(msg1);
		expect(returnedIds).toContain(msg2);
		expect(returnedIds).not.toContain(faceId);
	});

	it("ignores distance when category=MESSAGES_ONLY", async () => {
		if (!isDatabaseAvailable) return;

		const msgClose = await createTask("MsgClose", "MESSAGES_ONLY", {
			x: 27.58,
			y: 47.15,
		});
		const msgFar = await createTask("MsgFar", "MESSAGES_ONLY", {
			x: 27.8,
			y: 47.3,
		});

		const res = await app.request(
			"/api/tasks?category=MESSAGES_ONLY&lat=47.15&lng=27.58&radius=1",
			{
				headers: { Authorization: "Bearer fake-test-token" },
			},
		);
		const body: any = await res.json();

		expect(res.status).toBe(200);
		const returnedIds = body.data.data.map((t: any) => t.id);
		// both messages-only should be returned even though msgFar is outside radius
		expect(returnedIds).toContain(msgClose);
		expect(returnedIds).toContain(msgFar);
	});

	it("applies distance for FACE_TO_FACE category", async () => {
		if (!isDatabaseAvailable) return;

		const near = await createTask("NearFace", "FACE_TO_FACE", {
			x: 27.58,
			y: 47.15,
		});
		const far = await createTask("FarFace", "FACE_TO_FACE", {
			x: 27.8,
			y: 47.3,
		});
		// Also add a FACE_TO_FACE without location which should be excluded
		const noLoc = await createTask("NoLocFace", "FACE_TO_FACE");

		const res = await app.request(
			"/api/tasks?category=FACE_TO_FACE&lat=47.15&lng=27.58&radius=1",
			{
				headers: { Authorization: "Bearer fake-test-token" },
			},
		);
		const body: any = await res.json();

		expect(res.status).toBe(200);
		const returnedIds = body.data.data.map((t: any) => t.id);
		expect(returnedIds).toContain(near);
		expect(returnedIds).not.toContain(far);
		expect(returnedIds).not.toContain(noLoc);
	});

	it("returns 400 for invalid category value", async () => {
		if (!isDatabaseAvailable) return;

		const res = await app.request("/api/tasks?category=INVALID", {
			headers: { Authorization: "Bearer fake-test-token" },
		});
		expect(res.status).toBe(400);
	});
});
