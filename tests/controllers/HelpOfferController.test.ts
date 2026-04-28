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
import { loadControllers } from "../../src/utils/controller";
import { HelpRequestService } from "../../src/services/HelpRequestService";
import auth from "../../src/auth";
import {
	ConflictError,
	ForbiddenError,
	NotFoundError,
} from "../../src/utils/Errors";

describe("POST /api/tasks/:id/offers", () => {
	let authSpy: any;

	beforeAll(async () => {
		const controllersPath = join(
			(import.meta as any).dir,
			"../../src/controllers",
		);
		await loadControllers(controllersPath);
	});

	beforeEach(() => {
		authSpy = undefined;
	});

	afterEach(() => {
		authSpy?.mockRestore();
	});

	it("returns 401 without session", async () => {
		const response = await app.request("/api/tasks/1/offers", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({}),
		});

		expect(response.status).toBe(401);
	});

	it("returns 201 and the created HelpOffer for an authenticated volunteer", async () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-123" } as any,
			session: { id: "session-123", userId: "user-123" } as any,
		});

		const createdAt = new Date("2026-04-28T10:00:00.000Z");
		const serviceSpy = spyOn(
			HelpRequestService.prototype,
			"createOfferForTask",
		).mockResolvedValue({
			id: 77,
			helpRequestId: 1,
			volunteerId: 15,
			message: "Pot sa ajut",
			status: "PENDING",
			createdAt,
		} as any);

		try {
			const response = await app.request("/api/tasks/1/offers", {
				method: "POST",
				headers: {
					Authorization: "Bearer fake-test-token",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ message: "Pot sa ajut" }),
			});

			expect(response.status).toBe(201);
			expect(serviceSpy).toHaveBeenCalledWith(1, "user-123", {
				message: "Pot sa ajut",
			});

			const body: any = await response.json();
			expect(body).toMatchObject({
				id: 77,
				helpRequestId: 1,
				volunteerId: 15,
				message: "Pot sa ajut",
				status: "PENDING",
			});
			expect(body.createdAt).toBe(createdAt.toISOString());
		} finally {
			serviceSpy.mockRestore();
		}
	});

	it("returns 403 for an authenticated non-volunteer", async () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-456" } as any,
			session: { id: "session-456", userId: "user-456" } as any,
		});

		const serviceSpy = spyOn(
			HelpRequestService.prototype,
			"createOfferForTask",
		).mockRejectedValue(
			new ForbiddenError("Only volunteers can create offers"),
		);

		try {
			const response = await app.request("/api/tasks/1/offers", {
				method: "POST",
				headers: {
					Authorization: "Bearer fake-test-token",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ message: "test offer" }),
			});

			expect(response.status).toBe(403);
		} finally {
			serviceSpy.mockRestore();
		}
	});

	it("returns 403 for the task owner", async () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-owner" } as any,
			session: { id: "session-owner", userId: "user-owner" } as any,
		});

		const serviceSpy = spyOn(
			HelpRequestService.prototype,
			"createOfferForTask",
		).mockRejectedValue(new ForbiddenError("Task owner cannot create offers"));

		try {
			const response = await app.request("/api/tasks/1/offers", {
				method: "POST",
				headers: {
					Authorization: "Bearer fake-test-token",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ message: "test offer" }),
			});

			expect(response.status).toBe(403);
		} finally {
			serviceSpy.mockRestore();
		}
	});

	it("returns 404 for a non-existent task", async () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-123" } as any,
			session: { id: "session-123", userId: "user-123" } as any,
		});

		const serviceSpy = spyOn(
			HelpRequestService.prototype,
			"createOfferForTask",
		).mockRejectedValue(new NotFoundError("HelpRequest", "999"));

		try {
			const response = await app.request("/api/tasks/999/offers", {
				method: "POST",
				headers: {
					Authorization: "Bearer fake-test-token",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ message: "test offer" }),
			});

			expect(response.status).toBe(404);
		} finally {
			serviceSpy.mockRestore();
		}
	});

	it("returns 409 when the task is not OPEN", async () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-123" } as any,
			session: { id: "session-123", userId: "user-123" } as any,
		});

		const serviceSpy = spyOn(
			HelpRequestService.prototype,
			"createOfferForTask",
		).mockRejectedValue(new ConflictError("HelpRequest is not OPEN"));

		try {
			const response = await app.request("/api/tasks/1/offers", {
				method: "POST",
				headers: {
					Authorization: "Bearer fake-test-token",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ message: "test offer" }),
			});

			expect(response.status).toBe(409);
		} finally {
			serviceSpy.mockRestore();
		}
	});

	it("returns 409 for a duplicate pending offer", async () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-123" } as any,
			session: { id: "session-123", userId: "user-123" } as any,
		});

		const serviceSpy = spyOn(
			HelpRequestService.prototype,
			"createOfferForTask",
		).mockRejectedValue(
			new ConflictError("Volunteer already has a pending offer for this task"),
		);

		try {
			const response = await app.request("/api/tasks/1/offers", {
				method: "POST",
				headers: {
					Authorization: "Bearer fake-test-token",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ message: "test offer" }),
			});

			expect(response.status).toBe(409);
		} finally {
			serviceSpy.mockRestore();
		}
	});

	it("returns 201 when message is empty", async () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-123" } as any,
			session: { id: "session-123", userId: "user-123" } as any,
		});

		const serviceSpy = spyOn(
			HelpRequestService.prototype,
			"createOfferForTask",
		).mockResolvedValue({
			id: 88,
			helpRequestId: 1,
			volunteerId: 15,
			message: "",
			status: "PENDING",
			createdAt: new Date("2026-04-28T11:00:00.000Z"),
		} as any);

		try {
			const response = await app.request("/api/tasks/1/offers", {
				method: "POST",
				headers: {
					Authorization: "Bearer fake-test-token",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ message: "" }),
			});

			expect(response.status).toBe(201);
		} finally {
			serviceSpy.mockRestore();
		}
	});

	it("returns 400 when message exceeds 500 characters", async () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-123" } as any,
			session: { id: "session-123", userId: "user-123" } as any,
		});

		const serviceSpy = spyOn(
			HelpRequestService.prototype,
			"createOfferForTask",
		);

		try {
			const response = await app.request("/api/tasks/1/offers", {
				method: "POST",
				headers: {
					Authorization: "Bearer fake-test-token",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ message: "a".repeat(600) }),
			});

			expect(response.status).toBe(400);
			expect(serviceSpy).not.toHaveBeenCalled();
		} finally {
			serviceSpy.mockRestore();
		}
	});

	it("returns 400 when body contains volunteerId in strict mode", async () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-123" } as any,
			session: { id: "session-123", userId: "user-123" } as any,
		});

		const serviceSpy = spyOn(
			HelpRequestService.prototype,
			"createOfferForTask",
		);

		try {
			const response = await app.request("/api/tasks/1/offers", {
				method: "POST",
				headers: {
					Authorization: "Bearer fake-test-token",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ volunteerId: 123 }),
			});

			expect(response.status).toBe(400);
			expect(serviceSpy).not.toHaveBeenCalled();

			const body: any = await response.json();
			expect(body).toEqual({
				errors: [
					{
						field: "body",
						message: 'Unrecognized key: "volunteerId"',
					},
				],
			});
		} finally {
			serviceSpy.mockRestore();
		}
	});
});
