import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { Hono } from "hono";
import auth from "../../../src/auth";
import { HelpRequestController } from "../../../src/controllers/HelpRequestController";
import { HelpOfferService } from "../../../src/services/HelpOfferService";
import {
	NotFoundError,
	ForbiddenError,
	ConflictError,
} from "../../../src/utils/Errors";

describe("DELETE /tasks/:id", () => {
	let app: Hono;
	let serviceMock: any;
	let authSpy: ReturnType<typeof spyOn> | undefined;

	beforeEach(() => {
		authSpy?.mockRestore();
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-123" } as any,
			session: { id: "session-1", userId: "user-123" } as any,
		});

		serviceMock = {
			deleteHelpRequestByOwner: async (_id: number, _userId: string) =>
				undefined,
		} as any;

		const controller = new HelpRequestController(
			serviceMock as any,
			HelpOfferService.prototype as any,
		);

		app = new Hono();
		app.route("/tasks", controller.controller);
	});

	afterEach(() => {
		authSpy?.mockRestore();
	});

	test("returns 204 No Content on successful deletion", async () => {
		serviceMock.deleteHelpRequestByOwner = async (
			_id: number,
			_userId: string,
		) => undefined;

		const res = await app.request("http://localhost/tasks/1", {
			method: "DELETE",
		});

		expect(res.status).toBe(204);
	});

	test("returns 400 for invalid id", async () => {
		const res1 = await app.request("http://localhost/tasks/abc", {
			method: "DELETE",
		});
		const res2 = await app.request("http://localhost/tasks/-5", {
			method: "DELETE",
		});

		expect(res1.status).toBe(400);
		expect(res2.status).toBe(400);
	});

	test("returns 401 when not authenticated", async () => {
		authSpy?.mockRestore();
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue(undefined as any);

		const res = await app.request("http://localhost/tasks/1", {
			method: "DELETE",
		});
		expect(res.status).toBe(401);
	});

	test("maps ForbiddenError to 403", async () => {
		serviceMock.deleteHelpRequestByOwner = async () => {
			throw new ForbiddenError("Not your task");
		};

		const res = await app.request("http://localhost/tasks/1", {
			method: "DELETE",
		});
		expect(res.status).toBe(403);
	});

	test("maps NotFoundError to 404", async () => {
		serviceMock.deleteHelpRequestByOwner = async () => {
			throw new NotFoundError("HelpRequest", "1");
		};

		const res = await app.request("http://localhost/tasks/1", {
			method: "DELETE",
		});
		expect(res.status).toBe(404);
	});

	test("maps ConflictError to 409", async () => {
		serviceMock.deleteHelpRequestByOwner = async () => {
			throw new ConflictError("Task is IN_PROGRESS");
		};

		const res = await app.request("http://localhost/tasks/1", {
			method: "DELETE",
		});
		expect(res.status).toBe(409);
	});

	test("maps unexpected errors to 500", async () => {
		serviceMock.deleteHelpRequestByOwner = async () => {
			throw new Error("DB down");
		};

		const res = await app.request("http://localhost/tasks/1", {
			method: "DELETE",
		});
		expect(res.status).toBe(500);
	});
});
