/// <reference types="bun-types" />
import { afterEach, beforeAll, describe, expect, it, spyOn } from "bun:test";
import { join } from "node:path";
import app from "../../../src/app";
import auth from "../../../src/auth";
import { HelpRequestService } from "../../../src/services/HelpRequestService";
import { loadControllers } from "../../../src/utils/controller";
import {
	expectClientErrorApiResponse,
	expectSuccessApiResponse,
} from "../apiResponseAssertions";

beforeAll(async () => {
	await loadControllers(join(process.cwd(), "/src/controllers"));
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
			expect(serviceSpy).toHaveBeenCalledWith(1, 10, "createdAt", "DESC", {
				language: "zz",
			});
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

		expectClientErrorApiResponse(
			body,
			"Error: 'language' cannot be empty",
			400,
		);
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

			expect(serviceSpy).toHaveBeenCalledWith(1, 10, "createdAt", "DESC", {
				language: "ro",
			});
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

			expect(serviceSpy).toHaveBeenCalledWith(1, 10, "createdAt", "DESC", {
				language: "ro",
			});
		} finally {
			serviceSpy.mockRestore();
		}
	});
});
