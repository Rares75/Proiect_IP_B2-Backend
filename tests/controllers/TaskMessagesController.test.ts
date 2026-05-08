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
import app from "../../src/app";
import auth from "../../src/auth";
import { MessageService } from "../../src/services/MessageService";
import { loadControllers } from "../../src/utils/controller";

describe("GET /api/tasks/:id/messages", () => {
	let authSpy: any;
	let serviceSpy: any;

	beforeAll(async () => {
		const controllersPath = join(
			(import.meta as any).dir,
			"../../src/controllers",
		);
		await loadControllers(controllersPath);
	});

	beforeEach(() => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue(null as any);
		serviceSpy = undefined;
	});

	afterEach(() => {
		authSpy?.mockRestore();
		serviceSpy?.mockRestore();
	});

	it("returns 401 without auth session or guest header", async () => {
		const response = await app.request("/api/tasks/1/messages");

		expect(response.status).toBe(401);
	});

	it("returns 400 for invalid query params", async () => {
		const response = await app.request("/api/tasks/1/messages?page=0", {
			headers: { "X-Guest-Session": "guest-session-1" },
		});

		expect(response.status).toBe(400);
	});

	it("returns paginated messages for an authenticated owner or volunteer", async () => {
		authSpy.mockResolvedValue({
			user: { id: "user-1" } as any,
			session: { id: "session-1", userId: "user-1" } as any,
		});

		const createdAt = new Date("2026-05-08T10:00:00.000Z");
		serviceSpy = spyOn(
			MessageService.prototype,
			"getMessagesForTask",
		).mockResolvedValue({
			status: 200,
			body: {
				data: [
					{
						id: 10,
						senderId: "user-1",
						type: "TEXTCONTENT",
						content: "Salut",
						audioUrl: null,
						createdAt,
					},
				],
				meta: { page: 2, pageSize: 5, total: 6, totalPages: 2 },
			},
		});

		const response = await app.request(
			"/api/tasks/7/messages?page=2&pageSize=5",
		);

		expect(response.status).toBe(200);
		expect(serviceSpy).toHaveBeenCalledWith(
			7,
			{ kind: "auth", userId: "user-1" },
			2,
			5,
		);

		const body = await response.json();

		expect(body).toEqual({
			app: {
				url: "http://localhost:3000",
			},
			data: {
				data: [
					{
						id: 10,
						senderId: "user-1",
						type: "TEXTCONTENT",
						content: "Salut",
						audioUrl: null,
						createdAt: createdAt.toISOString(),
					},
				],
				meta: { page: 2, pageSize: 5, total: 6, totalPages: 2 },
			},
			isClientError: false,
			isForbidden: false,
			isServerError: false,
			isUnauthorized: false,
			message: "Request completed successfully",
			notFound: false,
			statusCode: 200,
		});
	});

	it("returns paginated messages for a valid guest session", async () => {
		serviceSpy = spyOn(
			MessageService.prototype,
			"getMessagesForTask",
		).mockResolvedValue({
			status: 200,
			body: {
				data: [],
				meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
			},
		});

		const response = await app.request("/api/tasks/7/messages", {
			headers: { "X-Guest-Session": "guest-session-1" },
		});

		expect(response.status).toBe(200);
		expect(serviceSpy).toHaveBeenCalledWith(
			7,
			{ kind: "guest", guestSessionId: "guest-session-1" },
			1,
			20,
		);
	});

	it("returns 403 for an authenticated user unrelated to the task", async () => {
		authSpy.mockResolvedValue({
			user: { id: "user-2" } as any,
			session: { id: "session-2", userId: "user-2" } as any,
		});
		serviceSpy = spyOn(
			MessageService.prototype,
			"getMessagesForTask",
		).mockResolvedValue({
			status: 403,
			message: "Forbidden",
		});

		const response = await app.request("/api/tasks/7/messages");

		expect(response.status).toBe(403);
	});

	it("returns 403 for a wrong guest session", async () => {
		serviceSpy = spyOn(
			MessageService.prototype,
			"getMessagesForTask",
		).mockResolvedValue({
			status: 403,
			message: "Forbidden",
		});

		const response = await app.request("/api/tasks/7/messages", {
			headers: { "X-Guest-Session": "wrong-session" },
		});

		expect(response.status).toBe(403);
	});

	it("returns 404 when the task has no conversation yet", async () => {
		authSpy.mockResolvedValue({
			user: { id: "user-1" } as any,
			session: { id: "session-1", userId: "user-1" } as any,
		});
		serviceSpy = spyOn(
			MessageService.prototype,
			"getMessagesForTask",
		).mockResolvedValue({
			status: 404,
			message: "Conversation not found",
		});

		const response = await app.request("/api/tasks/7/messages");

		expect(response.status).toBe(404);
	});
});
