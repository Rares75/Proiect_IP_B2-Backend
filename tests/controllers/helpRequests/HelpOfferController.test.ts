/// <reference types="bun-types" />
import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { Hono } from "hono";
import auth from "../../../src/auth";
import { HelpOfferController } from "../../../src/controllers/HelpOfferController";
import {
	HelpOfferDuplicatePendingError,
	HelpOfferForbiddenError,
	HelpOfferService,
	HelpOfferTaskNotFoundError,
	HelpOfferTaskStatusConflictError,
} from "../../../src/services/HelpOfferService";
import {
	expectApiEnvelope,
	expectNotFoundApiResponse,
	expectSuccessApiResponse,
} from "../apiResponseAssertions";

describe("POST /api/tasks/:id/offers", () => {
	let authSpy: any;
	let app: Hono;

	beforeEach(() => {
		const controller = new HelpOfferController(
			HelpOfferService.prototype as any,
		);
		app = new Hono().basePath("/api");
		app.route("/tasks", controller.controller);
	});

	afterEach(() => {
		authSpy?.mockRestore();
		authSpy = undefined;
	});

	const authenticate = (userId = "volunteer-user") => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: userId, email: "test@test.com" } as any,
			session: { id: "session-123", userId } as any,
		});
	};

	it("returns 201 with created offer for an authenticated volunteer", async () => {
		authenticate();

		const createdAt = new Date("2026-05-04T12:00:00.000Z");
		const serviceSpy = spyOn(
			HelpOfferService.prototype,
			"createOffer",
		).mockResolvedValue({
			id: 10,
			helpRequestId: 1,
			volunteerId: 7,
			message: null,
			status: "PENDING",
			createdAt,
		} as any);

		try {
			const response = await app.request(
				"http://localhost/api/tasks/1/offers",
				{
					method: "POST",
					headers: {
						Authorization: "Bearer fake-test-token",
						"Content-Type": "application/json",
					},
					body: JSON.stringify({}),
				},
			);
			const body: any = await response.json();

			expect(response.status).toBe(201);
			expectSuccessApiResponse(
				body,
				{
					id: 10,
					helpRequestId: 1,
					volunteerId: 7,
					message: null,
					status: "PENDING",
					createdAt: createdAt.toISOString(),
				},
				201,
			);
			expect(serviceSpy).toHaveBeenCalledWith(1, "volunteer-user", {});
		} finally {
			serviceSpy.mockRestore();
		}
	});

	it("returns 401 without session", async () => {
		const response = await app.request("http://localhost/api/tasks/1/offers", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({}),
		});
		const body: any = await response.json();

		expect(response.status).toBe(401);
		expectApiEnvelope(body, 401);
	});

	it("returns 403 for non-volunteer user", async () => {
		authenticate("plain-user");

		const serviceSpy = spyOn(
			HelpOfferService.prototype,
			"createOffer",
		).mockRejectedValue(
			new HelpOfferForbiddenError(
				"Only volunteers can submit offers for tasks",
			),
		);

		try {
			const response = await app.request(
				"http://localhost/api/tasks/1/offers",
				{
					method: "POST",
					headers: {
						Authorization: "Bearer fake-test-token",
						"Content-Type": "application/json",
					},
					body: JSON.stringify({}),
				},
			);
			const body: any = await response.json();

			expect(response.status).toBe(403);
			expect(body.message).toBe("Only volunteers can submit offers for tasks");
		} finally {
			serviceSpy.mockRestore();
		}
	});

	it("returns 403 when task owner tries to create an offer", async () => {
		authenticate("owner-user");

		const serviceSpy = spyOn(
			HelpOfferService.prototype,
			"createOffer",
		).mockRejectedValue(
			new HelpOfferForbiddenError(
				"You cannot submit an offer for your own task",
			),
		);

		try {
			const response = await app.request(
				"http://localhost/api/tasks/1/offers",
				{
					method: "POST",
					headers: {
						Authorization: "Bearer fake-test-token",
						"Content-Type": "application/json",
					},
					body: JSON.stringify({}),
				},
			);
			const body: any = await response.json();

			expect(response.status).toBe(403);
			expect(body.message).toBe("You cannot submit an offer for your own task");
		} finally {
			serviceSpy.mockRestore();
		}
	});

	it("returns 404 when task does not exist", async () => {
		authenticate();

		const serviceSpy = spyOn(
			HelpOfferService.prototype,
			"createOffer",
		).mockRejectedValue(new HelpOfferTaskNotFoundError(999));

		try {
			const response = await app.request(
				"http://localhost/api/tasks/999/offers",
				{
					method: "POST",
					headers: {
						Authorization: "Bearer fake-test-token",
						"Content-Type": "application/json",
					},
					body: JSON.stringify({}),
				},
			);
			const body: any = await response.json();

			expect(response.status).toBe(404);
			expectNotFoundApiResponse(body, "HelpRequest with id 999 not found", 404);
		} finally {
			serviceSpy.mockRestore();
		}
	});

	it("returns 409 when task is not OPEN", async () => {
		authenticate();

		const serviceSpy = spyOn(
			HelpOfferService.prototype,
			"createOffer",
		).mockRejectedValue(new HelpOfferTaskStatusConflictError("MATCHED"));

		try {
			const response = await app.request(
				"http://localhost/api/tasks/1/offers",
				{
					method: "POST",
					headers: {
						Authorization: "Bearer fake-test-token",
						"Content-Type": "application/json",
					},
					body: JSON.stringify({}),
				},
			);
			const body: any = await response.json();

			expect(response.status).toBe(409);
			expect(body.message).toContain("OPEN tasks");
		} finally {
			serviceSpy.mockRestore();
		}
	});

	it("returns 409 when the same volunteer submits a duplicate pending offer", async () => {
		authenticate();

		const serviceSpy = spyOn(
			HelpOfferService.prototype,
			"createOffer",
		).mockRejectedValue(new HelpOfferDuplicatePendingError());

		try {
			const response = await app.request(
				"http://localhost/api/tasks/1/offers",
				{
					method: "POST",
					headers: {
						Authorization: "Bearer fake-test-token",
						"Content-Type": "application/json",
					},
					body: JSON.stringify({}),
				},
			);
			const body: any = await response.json();

			expect(response.status).toBe(409);
			expect(body.message).toBe(
				"A pending offer already exists for this volunteer and task",
			);
		} finally {
			serviceSpy.mockRestore();
		}
	});

	it("returns 201 when message is empty string", async () => {
		authenticate();

		const serviceSpy = spyOn(
			HelpOfferService.prototype,
			"createOffer",
		).mockResolvedValue({
			id: 11,
			helpRequestId: 1,
			volunteerId: 7,
			message: "",
			status: "PENDING",
			createdAt: new Date("2026-05-04T12:00:00.000Z"),
		} as any);

		try {
			const response = await app.request(
				"http://localhost/api/tasks/1/offers",
				{
					method: "POST",
					headers: {
						Authorization: "Bearer fake-test-token",
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ message: "" }),
				},
			);

			expect(response.status).toBe(201);
			expect(serviceSpy).toHaveBeenCalledWith(1, "volunteer-user", {
				message: "",
			});
		} finally {
			serviceSpy.mockRestore();
		}
	});

	it("returns 400 when message exceeds 500 characters", async () => {
		authenticate();

		const response = await app.request("http://localhost/api/tasks/1/offers", {
			method: "POST",
			headers: {
				Authorization: "Bearer fake-test-token",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ message: "a".repeat(600) }),
		});
		const body: any = await response.json();

		expect(response.status).toBe(400);
		expect(body.data.errors).toContainEqual({
			field: "message",
			message: "Message must be at most 500 characters",
		});
	});

	it("returns 400 when body contains volunteerId in strict mode", async () => {
		authenticate();

		const response = await app.request("http://localhost/api/tasks/1/offers", {
			method: "POST",
			headers: {
				Authorization: "Bearer fake-test-token",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ volunteerId: 123 }),
		});
		const body: any = await response.json();

		expect(response.status).toBe(400);
		expectApiEnvelope(body, 400);
		expect(body.isClientError).toBe(true);
		expect(body.data.errors[0].field).toBe("body");
	});
});
