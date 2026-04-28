/// <reference types="bun-types" />
import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { Hono } from "hono";
import auth from "../../src/auth";
import { HelpRequestController } from "../../src/controllers/HelpRequestController";
import { HelpRequestService } from "../../src/services/HelpRequestService";

describe("GET /api/tasks distance filter", () => {
	let authSpy: any;
	let app: Hono;

	beforeEach(() => {
		const controller = new HelpRequestController(
			HelpRequestService.prototype as any,
		);

		app = new Hono().basePath("/api");
		app.route("/tasks", controller.controller);
	});

	afterEach(() => {
		authSpy?.mockRestore();
		authSpy = undefined;
	});

	it("returns 401 when request is unauthenticated", async () => {
		const response = await app.request(
			"http://localhost/api/tasks?lat=47.15&lng=27.58&radius=10",
		);
		expect(response.status).toBe(401);
	});

	it("passes explicit radius and coordinates to the service", async () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-123", email: "test@test.com" } as any,
			session: { id: "session-123" } as any,
		});

		const serviceSpy = spyOn(
			HelpRequestService.prototype,
			"getPaginatedTasks",
		).mockResolvedValue({
			data: [{ id: 1 } as any],
			meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
		});

		try {
			const response = await app.request(
				"http://localhost/api/tasks?lat=47.15&lng=27.58&radius=10",
				{
					headers: { Authorization: "Bearer fake-test-token" },
				},
			);

			expect(response.status).toBe(200);
			expect(serviceSpy).toHaveBeenCalledWith(
				1,
				10,
				"createdAt",
				"DESC",
				{
					distance: {
						lat: 47.15,
						lng: 27.58,
						radiusKm: 10,
					},
				},
				"user-123",
			);
		} finally {
			serviceSpy.mockRestore();
		}
	});

	it("returns 400 when lat is missing", async () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-123", email: "test@test.com" } as any,
			session: { id: "session-123" } as any,
		});

		const response = await app.request("http://localhost/api/tasks?lng=27.58", {
			headers: { Authorization: "Bearer fake-test-token" },
		});
		const body: any = await response.json();

		expect(response.status).toBe(400);
		expect(body.error).toContain("'lat' si 'lng' trebuie trimise impreuna");
	});

	it("returns 400 when lng is missing", async () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-123", email: "test@test.com" } as any,
			session: { id: "session-123" } as any,
		});

		const response = await app.request("http://localhost/api/tasks?lat=47.15", {
			headers: { Authorization: "Bearer fake-test-token" },
		});

		expect(response.status).toBe(400);
	});

	it("returns 400 for invalid latitude", async () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-123", email: "test@test.com" } as any,
			session: { id: "session-123" } as any,
		});

		const response = await app.request(
			"http://localhost/api/tasks?lat=999&lng=27.58",
			{
				headers: { Authorization: "Bearer fake-test-token" },
			},
		);

		expect(response.status).toBe(400);
	});

	it("returns 400 for invalid radius", async () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-123", email: "test@test.com" } as any,
			session: { id: "session-123" } as any,
		});

		const negativeRadiusResponse = await app.request(
			"http://localhost/api/tasks?lat=47.15&lng=27.58&radius=-5",
			{
				headers: { Authorization: "Bearer fake-test-token" },
			},
		);
		expect(negativeRadiusResponse.status).toBe(400);

		const zeroRadiusResponse = await app.request(
			"http://localhost/api/tasks?lat=47.15&lng=27.58&radius=0",
			{
				headers: { Authorization: "Bearer fake-test-token" },
			},
		);
		expect(zeroRadiusResponse.status).toBe(400);
	});

	it("returns 400 with Radius is required when service cannot infer default radius", async () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-123", email: "test@test.com" } as any,
			session: { id: "session-123" } as any,
		});

		const serviceSpy = spyOn(
			HelpRequestService.prototype,
			"getPaginatedTasks",
		).mockRejectedValue(new Error("Radius is required"));

		try {
			const response = await app.request(
				"http://localhost/api/tasks?lat=47.15&lng=27.58",
				{
					headers: { Authorization: "Bearer fake-test-token" },
				},
			);
			const body: any = await response.json();

			expect(response.status).toBe(400);
			expect(body).toEqual({ error: "Radius is required" });
		} finally {
			serviceSpy.mockRestore();
		}
	});
});
