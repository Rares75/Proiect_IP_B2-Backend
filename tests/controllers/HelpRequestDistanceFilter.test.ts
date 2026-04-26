/// <reference types="bun-types" />
import { afterEach, beforeAll, describe, expect, it, spyOn } from "bun:test";
import { join } from "node:path";
import app from "../../src/app";
import auth from "../../src/auth";
import { HelpRequestService } from "../../src/services/HelpRequestService";
import { loadControllers } from "../../src/utils/controller";

beforeAll(async () => {
	await loadControllers(join(import.meta.dir, "../../src/controllers"));
});

describe("GET /api/tasks distance filter", () => {
	let authSpy: any;

	afterEach(() => {
		authSpy?.mockRestore();
	});

	it("returns 401 when request is unauthenticated", async () => {
		const response = await app.request(
			"/api/tasks?lat=47.15&lng=27.58&radius=10",
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

		const response = await app.request(
			"/api/tasks?lat=47.15&lng=27.58&radius=10",
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

		serviceSpy.mockRestore();
	});

	it("returns 400 when lat is missing", async () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-123", email: "test@test.com" } as any,
			session: { id: "session-123" } as any,
		});

		const response = await app.request("/api/tasks?lng=27.58", {
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

		const response = await app.request("/api/tasks?lat=47.15", {
			headers: { Authorization: "Bearer fake-test-token" },
		});

		expect(response.status).toBe(400);
	});

	it("returns 400 for invalid latitude", async () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-123", email: "test@test.com" } as any,
			session: { id: "session-123" } as any,
		});

		const response = await app.request("/api/tasks?lat=999&lng=27.58", {
			headers: { Authorization: "Bearer fake-test-token" },
		});

		expect(response.status).toBe(400);
	});

	it("returns 400 for invalid radius", async () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-123", email: "test@test.com" } as any,
			session: { id: "session-123" } as any,
		});

		const negativeRadiusResponse = await app.request(
			"/api/tasks?lat=47.15&lng=27.58&radius=-5",
			{
				headers: { Authorization: "Bearer fake-test-token" },
			},
		);
		expect(negativeRadiusResponse.status).toBe(400);

		const zeroRadiusResponse = await app.request(
			"/api/tasks?lat=47.15&lng=27.58&radius=0",
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

		const response = await app.request("/api/tasks?lat=47.15&lng=27.58", {
			headers: { Authorization: "Bearer fake-test-token" },
		});
		const body: any = await response.json();

		expect(response.status).toBe(400);
		expect(body).toEqual({ error: "Radius is required" });

		serviceSpy.mockRestore();
	});
});
