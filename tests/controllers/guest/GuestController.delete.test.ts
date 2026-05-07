/// <reference types="bun-types" />
import {
	afterEach,
	beforeAll,
	describe,
	expect,
	it,
	spyOn,
	vi,
} from "bun:test";
import { join } from "node:path";
import app from "../../../src/app";
import { HelpRequestService } from "../../../src/services/HelpRequestService";
import { loadControllers } from "../../../src/utils/controller";
import {
	NotFoundError,
	ForbiddenError,
	ConflictError,
} from "../../../src/utils/Errors";

describe("GuestController - DELETE /api/guest/tasks/:id", () => {
	const validGuestSession = "123e4567-e89b-12d3-a456-426614174000";

	beforeAll(async () => {
		const controllersPath = join(
			(import.meta as any).dir,
			"../../src/controllers",
		);
		await loadControllers(controllersPath);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns 401 when the guest session header is missing", async () => {
		const response = await app.request("/api/guest/tasks/1", {
			method: "DELETE",
		});

		expect(response.status).toBe(401);
		const body: any = await response.json();
		expect(body.isUnauthorized).toBe(true);
		expect(body.message).toBe("Missing X-Guest-Session header");
	});

	it("returns 404 when the task does not exist", async () => {
		const deleteSpy = spyOn(
			HelpRequestService.prototype,
			"deleteGuestHelpRequest",
		).mockRejectedValue(new NotFoundError("HelpRequest", "99"));

		const response = await app.request("/api/guest/tasks/99", {
			method: "DELETE",
			headers: { "X-Guest-Session": validGuestSession },
		});

		expect(response.status).toBe(404);
		const body: any = await response.json();
		expect(body.notFound).toBe(true);
		expect(body.message).toBe("Task not found");
		expect(deleteSpy).toHaveBeenCalledWith(validGuestSession, 99);
	});

	it("returns 403 when the guest session does not match the task owner", async () => {
		const deleteSpy = spyOn(
			HelpRequestService.prototype,
			"deleteGuestHelpRequest",
		).mockRejectedValue(
			new ForbiddenError("You do not have permission to delete this task."),
		);

		const response = await app.request("/api/guest/tasks/1", {
			method: "DELETE",
			headers: { "X-Guest-Session": validGuestSession },
		});

		expect(response.status).toBe(403);
		const body: any = await response.json();
		expect(body.isForbidden).toBe(true);
		expect(body.message).toBe(
			"Forbidden: X-Guest-Session does not match task owner",
		);
		expect(deleteSpy).toHaveBeenCalledWith(validGuestSession, 1);
	});

	it("returns 409 when the task is not OPEN", async () => {
		const deleteSpy = spyOn(
			HelpRequestService.prototype,
			"deleteGuestHelpRequest",
		).mockRejectedValue(
			new ConflictError("Task cannot be deleted because it is not OPEN."),
		);

		const response = await app.request("/api/guest/tasks/1", {
			method: "DELETE",
			headers: { "X-Guest-Session": validGuestSession },
		});

		expect(response.status).toBe(409);
		const body: any = await response.json();
		expect(body.isClientError).toBe(true);
		expect(body.message).toBe(
			"Conflict: Task cannot be deleted because it is not OPEN",
		);
		expect(deleteSpy).toHaveBeenCalledWith(validGuestSession, 1);
	});

	it("returns 204 with empty body when the session matches and the task is OPEN", async () => {
		const deleteSpy = spyOn(
			HelpRequestService.prototype,
			"deleteGuestHelpRequest",
		).mockResolvedValue(undefined);

		const response = await app.request("/api/guest/tasks/1", {
			method: "DELETE",
			headers: { "X-Guest-Session": validGuestSession },
		});

		expect(response.status).toBe(204);
		expect(await response.text()).toBe("");
		expect(deleteSpy).toHaveBeenCalledWith(validGuestSession, 1);
	});

	it("returns 400 when the task id is invalid (non-numeric)", async () => {
		const response = await app.request("/api/guest/tasks/not-a-number", {
			method: "DELETE",
			headers: { "X-Guest-Session": validGuestSession },
		});

		expect(response.status).toBe(400);
		const body: any = await response.json();
		expect(body.isClientError).toBe(true);
		expect(body.message).toBe("Task id must be a valid positive number");
	});

	it("returns 400 when the task id is negative or zero", async () => {
		const response = await app.request("/api/guest/tasks/-1", {
			method: "DELETE",
			headers: { "X-Guest-Session": validGuestSession },
		});

		expect(response.status).toBe(400);
		const body: any = await response.json();
		expect(body.isClientError).toBe(true);
	});

	it("returns 400 when X-Guest-Session format is invalid (not UUID)", async () => {
		const response = await app.request("/api/guest/tasks/1", {
			method: "DELETE",
			headers: { "X-Guest-Session": "invalid-session-format" },
		});

		expect(response.status).toBe(400);
		const body: any = await response.json();
		expect(body.isClientError).toBe(true);
		expect(body.message).toBe("Invalid X-Guest-Session format; must be a UUID");
	});
});
