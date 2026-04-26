/// <reference types="bun-types" />
import { afterEach, beforeAll, describe, expect, it, spyOn } from "bun:test";
import { join } from "node:path";
import app from "../../../src/app";
import auth from "../../../src/auth";
import { HelpRequestService } from "../../../src/services/HelpRequestService";
import { loadControllers } from "../../../src/utils/controller";

beforeAll(async () => {
	await loadControllers(join(import.meta.dir, "../../src/controllers"));
});

describe("GET /api/tasks skill filter & sorting", () => {
	let authSpy: ReturnType<typeof spyOn> | undefined;

	afterEach(() => {
		authSpy?.mockRestore();
		authSpy = undefined;
	});

	const authenticate = () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-123", email: "test@test.com" } as any,
			session: { id: "session-123" } as any,
		});
	};

	it("?skill=sofer → tasks cu skill apar primele, cele fara incluse dupa", async () => {
		authenticate();

		const serviceSpy = spyOn(
			HelpRequestService.prototype,
			"getPaginatedTasks",
		).mockResolvedValue({
			data: [
				{ id: 1, skillsNeeded: ["sofer"] }, // scor 1
				{ id: 2, skillsNeeded: null }, // scor 0
				{ id: 3, skillsNeeded: [] }, // scor 0
			] as any,
			meta: { page: 1, pageSize: 10, total: 3, totalPages: 1 },
		});

		try {
			const response = await app.request("/api/tasks?skill=sofer", {
				headers: { Authorization: "Bearer fake-test-token" },
			});

			const body: any = await response.json();

			expect(response.status).toBe(200);

			// toate sunt incluse
			expect(body.data).toHaveLength(3);

			// primul are skill match
			expect(body.data[0].skillsNeeded).toContain("sofer");

			// cele fara skills sunt dupa
			expect(body.data[1].skillsNeeded).toBeNull();
			expect(body.data[2].skillsNeeded).toEqual([]);

			expect(body.meta.total).toBe(3);

			expect(serviceSpy).toHaveBeenCalledWith(1, 10, "createdAt", "DESC", {
				skills: ["sofer"],
			});
		} finally {
			serviceSpy.mockRestore();
		}
	});

	it("?skill=sofer&skill=traducator → task cu ambele apare primul", async () => {
		authenticate();

		const serviceSpy = spyOn(
			HelpRequestService.prototype,
			"getPaginatedTasks",
		).mockResolvedValue({
			data: [
				{ id: 1, skillsNeeded: ["sofer", "traducator"] }, // scor 2
				{ id: 2, skillsNeeded: ["sofer"] }, // scor 1
				{ id: 3, skillsNeeded: ["mecanic"] }, // scor 0
			] as any,
			meta: { page: 1, pageSize: 10, total: 3, totalPages: 1 },
		});

		try {
			const response = await app.request(
				"/api/tasks?skill=sofer&skill=traducator",
				{
					headers: { Authorization: "Bearer fake-test-token" },
				},
			);

			const body: any = await response.json();

			expect(response.status).toBe(200);

			expect(body.data[0].skillsNeeded).toEqual(
				expect.arrayContaining(["sofer", "traducator"]),
			);

			expect(body.data[1].skillsNeeded).toContain("sofer");

			expect(body.data[2].skillsNeeded).toEqual(["mecanic"]);

			expect(serviceSpy).toHaveBeenCalledWith(1, 10, "createdAt", "DESC", {
				skills: ["sofer", "traducator"],
			});
		} finally {
			serviceSpy.mockRestore();
		}
	});

	it("include task cu skillsNeeded null si scor 0", async () => {
		authenticate();

		const serviceSpy = spyOn(
			HelpRequestService.prototype,
			"getPaginatedTasks",
		).mockResolvedValue({
			data: [{ id: 1, skillsNeeded: null }] as any,
			meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
		});

		try {
			const response = await app.request("/api/tasks?skill=sofer", {
				headers: { Authorization: "Bearer fake-test-token" },
			});

			const body: any = await response.json();

			expect(response.status).toBe(200);
			expect(body.data[0].skillsNeeded).toBeNull();
		} finally {
			serviceSpy.mockRestore();
		}
	});

	it("include task cu skillsNeeded [] si scor 0", async () => {
		authenticate();

		const serviceSpy = spyOn(
			HelpRequestService.prototype,
			"getPaginatedTasks",
		).mockResolvedValue({
			data: [{ id: 1, skillsNeeded: [] }] as any,
			meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
		});

		try {
			const response = await app.request("/api/tasks?skill=sofer", {
				headers: { Authorization: "Bearer fake-test-token" },
			});

			const body: any = await response.json();

			expect(response.status).toBe(200);
			expect(body.data[0].skillsNeeded).toEqual([]);
		} finally {
			serviceSpy.mockRestore();
		}
	});

	it("task cu skillsNeeded ['mecanic'] si ?skill=sofer → inclus, scor 0", async () => {
		authenticate();

		const serviceSpy = spyOn(
			HelpRequestService.prototype,
			"getPaginatedTasks",
		).mockResolvedValue({
			data: [{ id: 1, skillsNeeded: ["mecanic"] }] as any,
			meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
		});

		try {
			const response = await app.request("/api/tasks?skill=sofer", {
				headers: { Authorization: "Bearer fake-test-token" },
			});

			const body: any = await response.json();

			expect(response.status).toBe(200);
			expect(body.data).toHaveLength(1);
		} finally {
			serviceSpy.mockRestore();
		}
	});

	it("?skill= → 400 cu mesaj explicit", async () => {
		authenticate();

		const response = await app.request("/api/tasks?skill=", {
			headers: { Authorization: "Bearer fake-test-token" },
		});

		const body: any = await response.json();

		expect(response.status).toBe(400);
		expect(body).toEqual({
			error: "Error: 'skill' cannot be empty",
		});
	});

	it("functioneaza combinat cu alti filtri si paginare", async () => {
		authenticate();

		const serviceSpy = spyOn(
			HelpRequestService.prototype,
			"getPaginatedTasks",
		).mockResolvedValue({
			data: [{ id: 1, status: "OPEN", city: "Iasi" }] as any,
			meta: { page: 2, pageSize: 5, total: 10, totalPages: 2 },
		});

		try {
			const response = await app.request(
				"/api/tasks?skill=sofer&status=OPEN&city=Iasi&page=2&pageSize=5",
				{
					headers: { Authorization: "Bearer fake-test-token" },
				},
			);

			const body: any = await response.json();

			expect(response.status).toBe(200);
			expect(body.meta.page).toBe(2);

			expect(serviceSpy).toHaveBeenCalledWith(2, 5, "createdAt", "DESC", {
				skills: ["sofer"],
				status: "OPEN",
				city: "iasi",
			});
		} finally {
			serviceSpy.mockRestore();
		}
	});

	it("meta.total include si task-urile cu scor 0", async () => {
		authenticate();

		const serviceSpy = spyOn(
			HelpRequestService.prototype,
			"getPaginatedTasks",
		).mockResolvedValue({
			data: [
				{ id: 1, skillsNeeded: ["sofer"] },
				{ id: 2, skillsNeeded: null },
			] as any,
			meta: { page: 1, pageSize: 10, total: 2, totalPages: 1 },
		});

		try {
			const response = await app.request("/api/tasks?skill=sofer", {
				headers: { Authorization: "Bearer fake-test-token" },
			});

			const body: any = await response.json();

			expect(response.status).toBe(200);
			expect(body.meta.total).toBe(2);
		} finally {
			serviceSpy.mockRestore();
		}
	});

	it("request neautentificat → 401", async () => {
		const response = await app.request("/api/tasks?skill=sofer");

		expect(response.status).toBe(401);
	});
});
