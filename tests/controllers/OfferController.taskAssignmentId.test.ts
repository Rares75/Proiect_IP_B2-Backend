/// <reference types="bun-types" />
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	mock,
	test,
} from "bun:test";
import { Hono } from "hono";
import auth from "../../src/auth";
import { spyOn } from "bun:test";
import { OfferController } from "../../src/controllers/OfferController";
import { OfferService } from "../../src/services/OfferService";
import { VolunteerRepository } from "../../src/db/repositories/volunteer.repository";

describe("PATCH /api/offers/:id/status — taskAssignmentId in response", () => {
	let app: Hono;
	let authSpy: ReturnType<typeof spyOn> | undefined;
	let updateOfferStatusMock: ReturnType<typeof mock>;
	let updateGuestOfferStatusMock: ReturnType<typeof mock>;

	const baseOffer = {
		id: 1,
		helpRequestId: 10,
		volunteerId: 5,
		message: "Pot ajuta",
		status: "ACCEPTED" as const,
		createdAt: new Date("2026-01-01T10:00:00Z"),
	};

	beforeEach(() => {
		updateOfferStatusMock = mock();
		updateGuestOfferStatusMock = mock();

		const controller = new OfferController(
			{
				updateOfferStatus: updateOfferStatusMock,
				updateGuestOfferStatus: updateGuestOfferStatusMock,
			} as unknown as OfferService,
			{} as VolunteerRepository,
		);

		app = new Hono().basePath("/api");
		app.route("/offers", controller.controller);
	});

	afterEach(() => {
		authSpy?.mockRestore();
		authSpy = undefined;
	});

	const authenticateAs = (userId = "owner-user") => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: userId, email: "owner@test.com" } as any,
			session: { id: "sess-1", userId } as any,
		});
	};

	// --- Authenticated flow ---

	test("raspunsul contine taskAssignmentId cand oferta este ACCEPTED (user autentificat)", async () => {
		authenticateAs();

		const acceptedOffer = { ...baseOffer, taskAssignmentId: 42 };
		updateOfferStatusMock.mockResolvedValueOnce(acceptedOffer);

		const response = await app.request("/api/offers/1/status", {
			method: "PATCH",
			headers: {
				Authorization: "Bearer token",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ status: "ACCEPTED" }),
		});

		const body: any = await response.json();

		expect(response.status).toBe(200);
		expect(body.data.taskAssignmentId).toBe(42);
		expect(body.data.status).toBe("ACCEPTED");
	});

	test("raspunsul NU contine taskAssignmentId cand oferta este REJECTED (user autentificat)", async () => {
		authenticateAs();

		const rejectedOffer = { ...baseOffer, status: "REJECTED" as const };
		updateOfferStatusMock.mockResolvedValueOnce(rejectedOffer);

		const response = await app.request("/api/offers/1/status", {
			method: "PATCH",
			headers: {
				Authorization: "Bearer token",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ status: "REJECTED" }),
		});

		const body: any = await response.json();

		expect(response.status).toBe(200);
		expect(body.data.taskAssignmentId).toBeUndefined();
		expect(body.data.status).toBe("REJECTED");
	});

	// --- Guest flow ---

	test("raspunsul contine taskAssignmentId cand oferta este ACCEPTED (guest)", async () => {
		// Nu mock-uim auth.api.getSession — lasam sa returneze null implicit
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue(null);

		const acceptedOffer = { ...baseOffer, taskAssignmentId: 99 };
		updateGuestOfferStatusMock.mockResolvedValueOnce(acceptedOffer);

		const response = await app.request("/api/offers/1/status", {
			method: "PATCH",
			headers: {
				"X-Guest-Session": "123e4567-e89b-12d3-a456-426614174000",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ status: "ACCEPTED" }),
		});

		const body: any = await response.json();

		expect(response.status).toBe(200);
		expect(body.data.taskAssignmentId).toBe(99);
		expect(body.data.status).toBe("ACCEPTED");
	});

	test("raspunsul NU contine taskAssignmentId cand oferta este REJECTED (guest)", async () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue(null);

		const rejectedOffer = { ...baseOffer, status: "REJECTED" as const };
		updateGuestOfferStatusMock.mockResolvedValueOnce(rejectedOffer);

		const response = await app.request("/api/offers/1/status", {
			method: "PATCH",
			headers: {
				"X-Guest-Session": "123e4567-e89b-12d3-a456-426614174000",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ status: "REJECTED" }),
		});

		const body: any = await response.json();

		expect(response.status).toBe(200);
		expect(body.data.taskAssignmentId).toBeUndefined();
		expect(body.data.status).toBe("REJECTED");
	});

	test("taskAssignmentId este un numar intreg pozitiv", async () => {
		authenticateAs();

		const acceptedOffer = { ...baseOffer, taskAssignmentId: 123 };
		updateOfferStatusMock.mockResolvedValueOnce(acceptedOffer);

		const response = await app.request("/api/offers/1/status", {
			method: "PATCH",
			headers: {
				Authorization: "Bearer token",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ status: "ACCEPTED" }),
		});

		const body: any = await response.json();

		expect(typeof body.data.taskAssignmentId).toBe("number");
		expect(body.data.taskAssignmentId).toBeGreaterThan(0);
		expect(Number.isInteger(body.data.taskAssignmentId)).toBe(true);
	});
});
