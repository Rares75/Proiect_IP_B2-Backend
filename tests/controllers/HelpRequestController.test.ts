/// <reference types="bun-types" />
import { describe, expect, it, beforeAll, spyOn, afterEach } from "bun:test";
import { join } from "node:path";
import app from "../../src/app";
import { loadControllers } from "../../src/utils/controller";
import { HelpRequestService } from "../../src/services/HelpRequestService";
import auth from "../../src/auth";

describe("GET /api/tasks/:id", () => {
	beforeAll(async () => {
		const controllersPath = join(
			(import.meta as any).dir,
			"../../src/controllers",
		);
		await loadControllers(controllersPath);
	});

	it("ar trebui sa returneze 400 pentru TOATE tipurile de ID-uri invalide", async () => {
		const badInputs = [
			"abc",
			"@#!",
			"-5",
			"0",
			"3.14",
			"999999999999999999999999",
		];

		for (const badId of badInputs) {
			const response = await app.request(`/api/tasks/${badId}`);
			const body: any = await response.json();

			expect(response.status).toBe(400);
			expect(body.error).toBe(
				"Eroare: ID-ul furnizat este invalid. Trebuie sa fie un numar intreg pozitiv.",
			);
		}
	});

	it("ar trebui sa returneze 404 pentru un task care nu exista", async () => {
		const fakeId = "999999";
		const mockNotFound = spyOn(
			HelpRequestService.prototype,
			"getHelpRequestById",
		).mockResolvedValue(undefined);

		try {
			const response = await app.request(`/api/tasks/${fakeId}`);
			const body: any = await response.json();

			expect(response.status).toBe(404);
			expect(body.error).toBe(
				`Eroare: Task-ul cu ID-ul '${fakeId}' nu exista in sistem.`,
			);
		} finally {
			mockNotFound.mockRestore();
		}
	});

	it("ar trebui sa returneze 500 daca pica baza de date / serverul", async () => {
		const mockError = spyOn(
			HelpRequestService.prototype,
			"getHelpRequestById",
		).mockRejectedValue(new Error("Baza de date a picat simulata!"));

		const response = await app.request(`/api/tasks/1`);
		const body: any = await response.json();

		expect(response.status).toBe(500);
		expect(body.error).toBe(
			"Eroare interna a serverului. Va rugam incercati mai tarziu.",
		);

		mockError.mockRestore();
	});

	it("ar trebui sa returneze 200 si datele pentru un task valid", async () => {
		const validId = "2";
		const mockTask = {
			id: Number(validId),
			title: "Test task",
			status: "OPEN",
			details: null,
		};
		const mockFound = spyOn(
			HelpRequestService.prototype,
			"getHelpRequestById",
		).mockResolvedValue(mockTask as any);

		try {
			const response = await app.request(`/api/tasks/${validId}`);
			const body: any = await response.json();

			expect(response.status).toBe(200);
			expect(body).toMatchObject(mockTask);
		} finally {
			mockFound.mockRestore();
		}
	});
});

describe("GET /api/tasks (Paginare BE1-12)", () => {
	let authSpy: any;

	afterEach(() => {
		if (authSpy) {
			authSpy.mockRestore();
		}
	});

	it("ar trebui sa returneze 401 pentru un request neautentificat", async () => {
		const response = await app.request(`/api/tasks`);
		expect(response.status).toBe(401);
	});

	it("ar trebui sa returneze 400 daca pageSize este 0", async () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-123", email: "test@test.com" } as any,
			session: { id: "session-123" } as any,
		});

		const response = await app.request(`/api/tasks?pageSize=0`, {
			headers: { Authorization: "Bearer fake-test-token" },
		});
		expect(response.status).toBe(400);
		const body: any = await response.json();
		expect(body.error).toContain("intre 1 si 100");
	});

	it("ar trebui sa returneze 400 daca page este numar negativ", async () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-123", email: "test@test.com" } as any,
			session: { id: "session-123" } as any,
		});

		const response = await app.request(`/api/tasks?page=-1`, {
			headers: { Authorization: "Bearer fake-test-token" },
		});
		expect(response.status).toBe(400);
	});

	it("ar trebui sa returneze 400 daca pageSize depaseste maximul (100)", async () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-123", email: "test@test.com" } as any,
			session: { id: "session-123" } as any,
		});

		const response = await app.request(`/api/tasks?pageSize=200`, {
			headers: { Authorization: "Bearer fake-test-token" },
		});
		expect(response.status).toBe(400);
	});

	it("ar trebui sa returneze 200 si valorile default (page 1, pageSize 10) cand nu sunt trimisi parametri", async () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-123", email: "test@test.com" } as any,
			session: { id: "session-123" } as any,
		});

		const serviceSpy = spyOn(
			HelpRequestService.prototype,
			"getPaginatedTasks",
		).mockResolvedValue({
			data: [{ id: 1, title: "Task Test", anonymousMode: false } as any],
			meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
		});

		const response = await app.request(`/api/tasks`, {
			headers: { Authorization: "Bearer fake-test-token" },
		});

		expect(response.status).toBe(200);
		const body: any = await response.json();
		expect(body.meta.page).toBe(1);
		expect(body.meta.pageSize).toBe(10);
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

	it("ar trebui sa returneze 200 si un array gol pentru o pagina inexistenta (ex: page=999)", async () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-123", email: "test@test.com" } as any,
			session: { id: "session-123" } as any,
		});

		const serviceSpy = spyOn(
			HelpRequestService.prototype,
			"getPaginatedTasks",
		).mockResolvedValue({
			data: [],
			meta: { page: 999, pageSize: 10, total: 5, totalPages: 1 },
		});

		const response = await app.request(`/api/tasks?page=999`, {
			headers: { Authorization: "Bearer fake-test-token" },
		});

		expect(response.status).toBe(200);
		const body: any = await response.json();
		expect(body.data).toBeArray();
		expect(body.data.length).toBe(0);
		expect(body.meta.page).toBe(999);
		expect(serviceSpy).toHaveBeenCalledWith(
			999,
			10,
			"createdAt",
			"DESC",
			{},
			"user-123",
		);

		serviceSpy.mockRestore();
	});

	it("ar trebui sa returneze 500 si un mesaj generic daca pica serverul (fara stack trace)", async () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-123", email: "test@test.com" } as any,
			session: { id: "session-123" } as any,
		});

		const consoleSpy = spyOn(console, "error").mockImplementation(() => {});

		const serviceSpy = spyOn(
			HelpRequestService.prototype,
			"getPaginatedTasks",
		).mockRejectedValue(
			new Error("DB_CRASH: parola bazei de date a fost compromisa!"),
		);

		const response = await app.request(`/api/tasks`, {
			headers: { Authorization: "Bearer fake-test-token" },
		});

		expect(response.status).toBe(500);
		const body: any = await response.json();

		expect(body.error).toBe("Eroare interna a serverului.");
		expect(body.error).not.toContain("parola bazei de date");

		serviceSpy.mockRestore();
		consoleSpy.mockRestore();
	});

	it("ar trebui sa returneze rezultatele corecte si meta actualizat pentru page=2 si pageSize=5", async () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-1" },
			session: { id: "sess-1" },
		} as any);

		const serviceSpy = spyOn(
			HelpRequestService.prototype,
			"getPaginatedTasks",
		).mockResolvedValue({
			data: [{ id: 6, title: "Task 6" } as any],
			meta: { page: 2, pageSize: 5, total: 6, totalPages: 2 },
		});

		const response = await app.request(`/api/tasks?page=2&pageSize=5`, {
			headers: { Authorization: "Bearer fake" },
		});
		expect(response.status).toBe(200);
		const body: any = await response.json();
		expect(body.meta.page).toBe(2);
		expect(body.meta.pageSize).toBe(5);
		expect(serviceSpy).toHaveBeenCalledWith(
			2,
			5,
			"createdAt",
			"DESC",
			{},
			"user-1",
		);

		serviceSpy.mockRestore();
	});

	it("ar trebui sa includa requestDetails complet daca exista, altfel null", async () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-1" },
			session: { id: "sess-1" },
		} as any);

		const serviceSpy = spyOn(
			HelpRequestService.prototype,
			"getPaginatedTasks",
		).mockResolvedValue({
			data: [
				{ id: 1, requestDetails: { notes: "Avem detalii" } } as any,
				{ id: 2, requestDetails: null } as any,
			],
			meta: { page: 1, pageSize: 10, total: 2, totalPages: 1 },
		});

		const response = await app.request(`/api/tasks`, {
			headers: { Authorization: "Bearer fake" },
		});
		const body: any = await response.json();

		expect(body.data[0].requestDetails).not.toBeNull();
		expect(body.data[1].requestDetails).toBeNull();
		expect(serviceSpy).toHaveBeenCalledWith(
			1,
			10,
			"createdAt",
			"DESC",
			{},
			"user-1",
		);

		serviceSpy.mockRestore();
	});

	it("ar trebui sa ascunda userId daca anonymousMode este true", async () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-1" },
			session: { id: "sess-1" },
		} as any);

		const serviceSpy = spyOn(
			HelpRequestService.prototype,
			"getPaginatedTasks",
		).mockResolvedValue({
			data: [
				{ id: 1, anonymousMode: true } as any,
				{ id: 2, anonymousMode: false, requestedByUserId: "user-123" } as any,
			],
			meta: { page: 1, pageSize: 10, total: 2, totalPages: 1 },
		});

		const response = await app.request(`/api/tasks`, {
			headers: { Authorization: "Bearer fake" },
		});
		const body: any = await response.json();

		expect(body.data[0].requestedByUserId).toBeUndefined();
		expect(body.data[1].requestedByUserId).toBe("user-123");
		expect(serviceSpy).toHaveBeenCalledWith(
			1,
			10,
			"createdAt",
			"DESC",
			{},
			"user-1",
		);

		serviceSpy.mockRestore();
	});
});
