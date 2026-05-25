/// <reference types="bun-types" />
import { describe, expect, it, beforeAll, spyOn, afterEach } from "bun:test";
import { join } from "node:path";
import app from "../../../src/app";
import { loadControllers } from "../../../src/utils/controller";
import { HelpRequestService } from "../../../src/services/HelpRequestService";
import { ForbiddenError, NotFoundError } from "../../../src/utils/Errors";
import {
	expectApiEnvelope,
	expectClientErrorApiResponse,
	expectNotFoundApiResponse,
	expectSuccessApiResponse,
} from "../apiResponseAssertions";

describe("GET /api/guest/tasks/:id/offers", () => {
	let serviceSpy: ReturnType<typeof spyOn> | undefined;

	beforeAll(async () => {
		const controllersPath = join(
			(import.meta as any).dir,
			"../../src/controllers",
		);
		await loadControllers(controllersPath);
	});

	afterEach(() => {
		serviceSpy?.mockRestore();
		serviceSpy = undefined;
	});

	const validUuid = "123e4567-e89b-12d3-a456-426614174000";

	const mockOffersResponse = {
		data: [
			{
				id: 1,
				volunteerId: 10,
				message: "Pot ajuta!",
				status: "PENDING",
				createdAt: "2026-01-01T10:00:00Z",
				volunteer: {
					username: "vol_user",
					trustScore: 4.5,
					averageRating: 4.8,
				},
			},
		],
		meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
	};

	it("1. returneaza 401 daca lipseste header-ul X-Guest-Session", async () => {
		const response = await app.request("/api/guest/tasks/1/offers");

		expect(response.status).toBe(401);
		const body: any = await response.json();
		expectApiEnvelope(body, 401);
		expect(body.isUnauthorized).toBe(true);
		expect(body.message).toBe("Missing X-Guest-Session header");
	});

	it("2. returneaza 400 daca X-Guest-Session nu este UUID valid", async () => {
		const response = await app.request("/api/guest/tasks/1/offers", {
			headers: { "X-Guest-Session": "not-a-uuid" },
		});

		expect(response.status).toBe(400);
		const body: any = await response.json();
		expectClientErrorApiResponse(
			body,
			"Invalid X-Guest-Session format; must be a UUID",
			400,
		);
	});

	it("3. returneaza 400 daca task id nu este un numar valid", async () => {
		const response = await app.request("/api/guest/tasks/abc/offers", {
			headers: { "X-Guest-Session": validUuid },
		});

		expect(response.status).toBe(400);
		const body: any = await response.json();
		expectClientErrorApiResponse(
			body,
			"Task id must be a valid positive number",
			400,
		);
	});

	it("4. returneaza 400 daca task id este 0 sau negativ", async () => {
		const response = await app.request("/api/guest/tasks/0/offers", {
			headers: { "X-Guest-Session": validUuid },
		});

		expect(response.status).toBe(400);
		const body: any = await response.json();
		expectClientErrorApiResponse(
			body,
			"Task id must be a valid positive number",
			400,
		);
	});

	it("5. returneaza 400 pentru parametri de paginare invalizi", async () => {
		const response = await app.request(
			"/api/guest/tasks/1/offers?page=0&pageSize=100",
			{
				headers: { "X-Guest-Session": validUuid },
			},
		);

		expect(response.status).toBe(400);
		const body: any = await response.json();
		expectClientErrorApiResponse(body, "Invalid pagination parameters", 400);
	});

	it("6. returneaza 400 pentru status invalid", async () => {
		const response = await app.request(
			"/api/guest/tasks/1/offers?status=INVALID",
			{
				headers: { "X-Guest-Session": validUuid },
			},
		);

		expect(response.status).toBe(400);
		const body: any = await response.json();
		expectClientErrorApiResponse(
			body,
			"Invalid status; accepted: PENDING, ACCEPTED, REJECTED",
			400,
		);
	});

	it("7. returneaza 404 daca task-ul nu exista", async () => {
		serviceSpy = spyOn(
			HelpRequestService.prototype,
			"getPaginatedOffersForGuestTaskOwner",
		).mockRejectedValue(new NotFoundError("HelpRequest", "99"));

		const response = await app.request("/api/guest/tasks/99/offers", {
			headers: { "X-Guest-Session": validUuid },
		});

		expect(response.status).toBe(404);
		const body: any = await response.json();
		expectNotFoundApiResponse(body, "Task not found", 404);
	});

	it("8. returneaza 403 daca guestSessionId nu corespunde cu task-ul", async () => {
		serviceSpy = spyOn(
			HelpRequestService.prototype,
			"getPaginatedOffersForGuestTaskOwner",
		).mockRejectedValue(
			new ForbiddenError("You don't have permission to see this task."),
		);

		const response = await app.request("/api/guest/tasks/1/offers", {
			headers: { "X-Guest-Session": validUuid },
		});

		expect(response.status).toBe(403);
		const body: any = await response.json();
		expect(body.message).toBe(
			"Forbidden: X-Guest-Session does not match task owner",
		);
	});

	it("9. returneaza 200 cu lista de oferte pentru un guest valid", async () => {
		serviceSpy = spyOn(
			HelpRequestService.prototype,
			"getPaginatedOffersForGuestTaskOwner",
		).mockResolvedValue(mockOffersResponse as any);

		const response = await app.request("/api/guest/tasks/1/offers", {
			headers: { "X-Guest-Session": validUuid },
		});

		expect(response.status).toBe(200);
		const body: any = await response.json();
		expectSuccessApiResponse(body, mockOffersResponse, 200);
	});

	it("10. transmite corect parametrii catre service", async () => {
		serviceSpy = spyOn(
			HelpRequestService.prototype,
			"getPaginatedOffersForGuestTaskOwner",
		).mockResolvedValue(mockOffersResponse as any);

		await app.request(
			"/api/guest/tasks/5/offers?page=2&pageSize=5&status=PENDING",
			{
				headers: { "X-Guest-Session": validUuid },
			},
		);

		expect(serviceSpy).toHaveBeenCalledWith(5, validUuid, 2, 5, "PENDING");
	});

	it("11. foloseste valorile default pentru paginare daca nu sunt trimisi params", async () => {
		serviceSpy = spyOn(
			HelpRequestService.prototype,
			"getPaginatedOffersForGuestTaskOwner",
		).mockResolvedValue(mockOffersResponse as any);

		await app.request("/api/guest/tasks/3/offers", {
			headers: { "X-Guest-Session": validUuid },
		});

		expect(serviceSpy).toHaveBeenCalledWith(3, validUuid, 1, 10, undefined);
	});

	it("12. returneaza 500 daca service-ul arunca o eroare neasteptata", async () => {
		const consoleSpy = spyOn(console, "error").mockImplementation(() => {});

		serviceSpy = spyOn(
			HelpRequestService.prototype,
			"getPaginatedOffersForGuestTaskOwner",
		).mockRejectedValue(new Error("DB connection lost"));

		const response = await app.request("/api/guest/tasks/1/offers", {
			headers: { "X-Guest-Session": validUuid },
		});

		expect(response.status).toBe(500);
		const body: any = await response.json();
		expectApiEnvelope(body, 500);
		expect(body.isServerError).toBe(true);

		consoleSpy.mockRestore();
	});
});
