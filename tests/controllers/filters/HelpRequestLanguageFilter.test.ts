/// <reference types="bun-types" />
import { afterEach, beforeAll, describe, expect, it, spyOn } from "bun:test";
import { Hono } from "hono";
import auth from "../../../src/auth";
import { HelpRequestController } from "../../../src/controllers/HelpRequestController";
import { HelpOfferService } from "../../../src/services/HelpOfferService";
import { HelpRequestService } from "../../../src/services/HelpRequestService";
import { expectSuccessApiResponse } from "../apiResponseAssertions";

let app: Hono;

beforeAll(() => {
	const controller = new HelpRequestController(
		HelpRequestService.prototype as any,
		HelpOfferService.prototype as any,
		{} as any,
	);

	app = new Hono().basePath("/api");
	app.route("/tasks", controller.controller);
});

describe("GET /api/tasks language filter", () => {
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

	it("returns 200 with empty data array for unknown language (?language=ZZ)", async () => {
		authenticate();

		const mockResponse = {
			data: [],
			meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
		};

		const serviceSpy = spyOn(
			HelpRequestService.prototype,
			"getPaginatedTasks",
		).mockResolvedValue(mockResponse);

		try {
			const response = await app.request("/api/tasks?language=ZZ", {
				headers: { Authorization: "Bearer fake-test-token" },
			});
			const body: any = await response.json();

			expect(response.status).toBe(200);
			expectSuccessApiResponse(body, mockResponse, 200);

			// Ajustat pentru envelope-ul sendApiResponse
			expect(body.data.data).toEqual([]);
			expect(body.data.meta.total).toBe(0);

			// language este normalizat la lowercase de validator
			expect(serviceSpy).toHaveBeenCalledWith(
				1,
				10,
				"createdAt",
				"DESC",
				{
					language: "zz",
				},
				"user-123",
			);
		} finally {
			serviceSpy.mockRestore();
		}
	});

	it("returns 400 with explicit error when language is empty (?language=)", async () => {
		authenticate();

		const response = await app.request("/api/tasks?language=", {
			headers: { Authorization: "Bearer fake-test-token" },
		});
		const body: any = await response.json();

		expect(response.status).toBe(400);
		expect(body).toEqual({
			errors: [
				{
					field: "language",
					message: "Language must not be empty",
				},
			],
		});
	});

	it("includes tasks without requestDetails in response for a valid language", async () => {
		authenticate();

		const mockResponse = {
			data: [
				{
					id: 1,
					title: "Task fara details",
					status: "OPEN",
					requestDetails: null,
				} as any,
				{
					id: 2,
					title: "Task cu languageNeeded null",
					status: "OPEN",
					requestDetails: { id: 22, helpRequestId: 2, languageNeeded: null },
				} as any,
				{
					id: 3,
					title: "Task cu languageNeeded RO",
					status: "OPEN",
					requestDetails: { id: 33, helpRequestId: 3, languageNeeded: "RO" },
				} as any,
			],
			meta: { page: 1, pageSize: 10, total: 3, totalPages: 1 },
		};

		const serviceSpy = spyOn(
			HelpRequestService.prototype,
			"getPaginatedTasks",
		).mockResolvedValue(mockResponse);

		try {
			const response = await app.request("/api/tasks?language=RO", {
				headers: { Authorization: "Bearer fake-test-token" },
			});
			const body: any = await response.json();

			expect(response.status).toBe(200);
			expectSuccessApiResponse(body, mockResponse, 200);

			// Ajustat pentru envelope
			expect(body.data.data).toHaveLength(3);
			expect(body.data.data[0].requestDetails).toBeNull();

			expect(serviceSpy).toHaveBeenCalledWith(
				1,
				10,
				"createdAt",
				"DESC",
				{
					language: "ro",
				},
				"user-123",
			);
		} finally {
			serviceSpy.mockRestore();
		}
	});

	it("treats language case-insensitively (?language=ro -> filters.language='ro')", async () => {
		authenticate();

		const mockResponse = {
			data: [{ id: 10, status: "OPEN" } as any],
			meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
		};

		const serviceSpy = spyOn(
			HelpRequestService.prototype,
			"getPaginatedTasks",
		).mockResolvedValue(mockResponse);

		try {
			const response = await app.request("/api/tasks?language=ro", {
				headers: { Authorization: "Bearer fake-test-token" },
			});
			const body: any = await response.json();

			expect(response.status).toBe(200);
			expectSuccessApiResponse(body, mockResponse, 200);

			expect(serviceSpy).toHaveBeenCalledWith(
				1,
				10,
				"createdAt",
				"DESC",
				{
					language: "ro",
				},
				"user-123",
			);
		} finally {
			serviceSpy.mockRestore();
		}
	});
});

describe("GET /api/tasks skill filter", () => {
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

	it("maps a single skill query param to filters.skills", async () => {
		authenticate();
		const serviceSpy = spyOn(
			HelpRequestService.prototype,
			"getPaginatedTasks",
		).mockResolvedValue({
			data: [{ id: 1, skillsNeeded: ["sofer"] } as any],
			meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
		});

		try {
			const response = await app.request("/api/tasks?skill=sofer", {
				headers: { Authorization: "Bearer fake-test-token" },
			});

			expect(response.status).toBe(200);
			expect(serviceSpy).toHaveBeenCalledWith(
				1,
				10,
				"createdAt",
				"DESC",
				{
					skills: ["sofer"],
				},
				"user-123",
			);
		} finally {
			serviceSpy.mockRestore();
		}
	});

	it("maps repeated skill query params to filters.skills", async () => {
		authenticate();
		const serviceSpy = spyOn(
			HelpRequestService.prototype,
			"getPaginatedTasks",
		).mockResolvedValue({
			data: [{ id: 2, skillsNeeded: ["sofer", "traducator"] } as any],
			meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
		});

		try {
			const response = await app.request(
				"/api/tasks?skill=sofer&skill=traducator",
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
					skills: ["sofer", "traducator"],
				},
				"user-123",
			);
		} finally {
			serviceSpy.mockRestore();
		}
	});

	it("returns 400 when skill is empty", async () => {
		authenticate();

		const response = await app.request("/api/tasks?skill=", {
			headers: { Authorization: "Bearer fake-test-token" },
		});
		const body: any = await response.json();

		expect(response.status).toBe(400);
		expect(body).toEqual({
			errors: [
				{
					field: "skill",
					message: "Skill must not be empty",
				},
			],
		});
	});

	it("returns 400 when skill is only spaces after trim", async () => {
		authenticate();

		const response = await app.request("/api/tasks?skill=%20%20", {
			headers: { Authorization: "Bearer fake-test-token" },
		});
		const body: any = await response.json();

		expect(response.status).toBe(400);
		expect(body).toEqual({
			errors: [
				{
					field: "skill",
					message: "Skill must not be empty",
				},
			],
		});
	});
});
