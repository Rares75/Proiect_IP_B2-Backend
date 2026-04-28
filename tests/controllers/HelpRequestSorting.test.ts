/// <reference types="bun-types" />
import { describe, expect, it, beforeAll, spyOn, afterEach } from "bun:test";
import app from "../../src/app";
import { HelpRequestService } from "../../src/services/HelpRequestService";
import auth from "../../src/auth";
import { join } from "node:path";
import { loadControllers } from "../../src/utils/controller";

beforeAll(async () => {
	await loadControllers(join(import.meta.dir, "../../src/controllers"));
});

describe("GET /api/tasks (Sortare BE1-13)", () => {
	let authSpy: any;

	afterEach(() => {
		if (authSpy) {
			authSpy.mockRestore();
		}
	});

	it("ar trebui sa returneze 400 daca sortBy este invalid (ex: titlu)", async () => {
		// Folosim mock-ul complet si corect, la fel ca in BE1-12
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-123", email: "test@test.com" } as any,
			session: { id: "session-123" } as any,
		});

		const response = await app.request(`/api/tasks?sortBy=titlu`, {
			headers: { Authorization: "Bearer fake-test-token" },
		});
		expect(response.status).toBe(400);

		const body: any = await response.json();
		expect(body.error).toContain("accepta doar");
	});

	it("ar trebui sa returneze 400 daca order este invalid (ex: RANDOM)", async () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-123", email: "test@test.com" } as any,
			session: { id: "session-123" } as any,
		});

		const response = await app.request(`/api/tasks?order=RANDOM`, {
			headers: { Authorization: "Bearer fake-test-token" },
		});
		expect(response.status).toBe(400);

		const body: any = await response.json();
		expect(body.error).toContain("accepta doar");
	});

	it("ar trebui sa foloseasca createdAt si DESC implicit daca nu sunt trimisi parametri", async () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-123", email: "test@test.com" } as any,
			session: { id: "session-123" } as any,
		});

		const serviceSpy = spyOn(
			HelpRequestService.prototype,
			"getPaginatedTasks",
		).mockResolvedValue({
			data: [],
			meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
		});

		const response = await app.request(`/api/tasks`, {
			headers: { Authorization: "Bearer fake-test-token" },
		});
		expect(response.status).toBe(200);

		expect(serviceSpy).toHaveBeenCalledWith(
			1,
			10,
			"createdAt",
			"DESC",
			{},
			"user-123",
		);
		serviceSpy.mockRestore();
	});

	it("ar trebui sa returneze CRITICAL primele pentru ?sortBy=urgency&order=DESC", async () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-123", email: "test@test.com" } as any,
			session: { id: "session-123" } as any,
		});

		const serviceSpy = spyOn(
			HelpRequestService.prototype,
			"getPaginatedTasks",
		).mockResolvedValue({
			data: [
				{ id: 1, urgency: "CRITICAL" } as any,
				{ id: 2, urgency: "LOW" } as any,
			],
			meta: { page: 1, pageSize: 10, total: 2, totalPages: 1 },
		});

		const response = await app.request(`/api/tasks?sortBy=urgency&order=DESC`, {
			headers: { Authorization: "Bearer fake-test-token" },
		});
		expect(response.status).toBe(200);

		const body: any = await response.json();
		expect(body.data[0].urgency).toBe("CRITICAL");
		expect(body.data[1].urgency).toBe("LOW");

		expect(serviceSpy).toHaveBeenCalledWith(
			1,
			10,
			"urgency",
			"DESC",
			{},
			"user-123",
		);
		serviceSpy.mockRestore();
	});

	it("ar trebui sa returneze LOW primele pentru ?sortBy=urgency&order=ASC", async () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-123", email: "test@test.com" } as any,
			session: { id: "session-123" } as any,
		});

		const serviceSpy = spyOn(
			HelpRequestService.prototype,
			"getPaginatedTasks",
		).mockResolvedValue({
			data: [
				{ id: 2, urgency: "LOW" } as any,
				{ id: 1, urgency: "CRITICAL" } as any,
			],
			meta: { page: 1, pageSize: 10, total: 2, totalPages: 1 },
		});

		const response = await app.request(`/api/tasks?sortBy=urgency&order=ASC`, {
			headers: { Authorization: "Bearer fake-test-token" },
		});
		expect(response.status).toBe(200);

		const body: any = await response.json();
		expect(body.data[0].urgency).toBe("LOW");

		expect(serviceSpy).toHaveBeenCalledWith(
			1,
			10,
			"urgency",
			"ASC",
			{},
			"user-123",
		);
		serviceSpy.mockRestore();
	});

	it("ar trebui sa returneze cele mai vechi primele pentru ?sortBy=createdAt&order=ASC", async () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-123", email: "test@test.com" } as any,
			session: { id: "session-123" } as any,
		});

		const serviceSpy = spyOn(
			HelpRequestService.prototype,
			"getPaginatedTasks",
		).mockResolvedValue({
			data: [
				{ id: 1, createdAt: "2023-01-01" } as any,
				{ id: 2, createdAt: "2024-01-01" } as any,
			],
			meta: { page: 1, pageSize: 10, total: 2, totalPages: 1 },
		});

		const response = await app.request(
			`/api/tasks?sortBy=createdAt&order=ASC`,
			{
				headers: { Authorization: "Bearer fake-test-token" },
			},
		);
		expect(response.status).toBe(200);

		const body: any = await response.json();
		expect(body.data[0].createdAt).toBe("2023-01-01");
		expect(body.data[1].createdAt).toBe("2024-01-01");

		expect(serviceSpy).toHaveBeenCalledWith(
			1,
			10,
			"createdAt",
			"ASC",
			{},
			"user-123",
		);
		serviceSpy.mockRestore();
	});

	it("ar trebui sa returneze cele mai noi primele pentru ?sortBy=createdAt&order=DESC", async () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-123", email: "test@test.com" } as any,
			session: { id: "session-123" } as any,
		});

		const serviceSpy = spyOn(
			HelpRequestService.prototype,
			"getPaginatedTasks",
		).mockResolvedValue({
			data: [
				{ id: 2, createdAt: "2024-01-01" } as any,
				{ id: 1, createdAt: "2023-01-01" } as any,
			],
			meta: { page: 1, pageSize: 10, total: 2, totalPages: 1 },
		});

		const response = await app.request(
			`/api/tasks?sortBy=createdAt&order=DESC`,
			{
				headers: { Authorization: "Bearer fake-test-token" },
			},
		);
		expect(response.status).toBe(200);

		const body: any = await response.json();
		expect(body.data[0].createdAt).toBe("2024-01-01");

		expect(serviceSpy).toHaveBeenCalledWith(
			1,
			10,
			"createdAt",
			"DESC",
			{},
			"user-123",
		);
		serviceSpy.mockRestore();
	});

	it("ar trebui sa aplice sortarea inainte de paginare pe un set mare de date", async () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-123", email: "test@test.com" } as any,
			session: { id: "session-123" } as any,
		});

		// Simulam o baza de date cu 50 de elemente
		const serviceSpy = spyOn(
			HelpRequestService.prototype,
			"getPaginatedTasks",
		).mockResolvedValue({
			data: [{ id: 6, urgency: "HIGH" } as any],
			meta: { page: 2, pageSize: 5, total: 50, totalPages: 10 },
		});

		const response = await app.request(
			`/api/tasks?page=2&pageSize=5&sortBy=urgency&order=DESC`,
			{
				headers: { Authorization: "Bearer fake-test-token" },
			},
		);
		expect(response.status).toBe(200);

		expect(serviceSpy).toHaveBeenCalledWith(
			2,
			5,
			"urgency",
			"DESC",
			{},
			"user-123",
		);
		serviceSpy.mockRestore();
	});
});
