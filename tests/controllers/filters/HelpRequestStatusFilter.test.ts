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

describe("GET /api/tasks status filter", () => {
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

	it("returns 401 when request is unauthenticated", async () => {
		const response = await app.request("/api/tasks?status=OPEN");
		expect(response.status).toBe(401);
	});

	it("returns only OPEN tasks for ?status=OPEN", async () => {
		authenticate();

		const mockResponse = {
			data: [
				{ id: 1, status: "OPEN" } as any,
				{ id: 2, status: "OPEN" } as any,
			],
			meta: { page: 1, pageSize: 10, total: 2, totalPages: 1 },
		};

		const serviceSpy = spyOn(
			HelpRequestService.prototype,
			"getPaginatedTasks",
		).mockResolvedValue(mockResponse);

		try {
			const response = await app.request("/api/tasks?status=OPEN", {
				headers: { Authorization: "Bearer fake-test-token" },
			});
			const body: any = await response.json();

			expect(response.status).toBe(200);

			expectSuccessApiResponse(body, mockResponse, 200);

			expect(body.data.data.every((task: any) => task.status === "OPEN")).toBe(
				true,
			);

			expect(serviceSpy).toHaveBeenCalled();
		} finally {
			serviceSpy.mockRestore();
		}
	});

	it("returns only COMPLETED tasks for ?status=COMPLETED", async () => {
		authenticate();

		const mockResponse = {
			data: [{ id: 7, status: "COMPLETED" } as any],
			meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
		};

		const serviceSpy = spyOn(
			HelpRequestService.prototype,
			"getPaginatedTasks",
		).mockResolvedValue(mockResponse);

		try {
			const response = await app.request("/api/tasks?status=COMPLETED", {
				headers: { Authorization: "Bearer fake-test-token" },
			});
			const body: any = await response.json();

			expect(response.status).toBe(200);
			expectSuccessApiResponse(body, mockResponse, 200);
			expect(body.data.data).toEqual([{ id: 7, status: "COMPLETED" }]);

			expect(serviceSpy).toHaveBeenCalled();
		} finally {
			serviceSpy.mockRestore();
		}
	});

	it("returns 200 with empty data array for ?status=OPEN when no OPEN tasks exist", async () => {
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
			const response = await app.request("/api/tasks?status=OPEN", {
				headers: { Authorization: "Bearer fake-test-token" },
			});
			const body: any = await response.json();

			expect(response.status).toBe(200);
			expectSuccessApiResponse(body, mockResponse, 200);

			expect(body.data.data).toEqual([]);
			expect(body.data.meta.total).toBe(0);
		} finally {
			serviceSpy.mockRestore();
		}
	});

	it("returns 400 with descriptive error for unknown status", async () => {
		authenticate();

		const response = await app.request("/api/tasks?status=DONE", {
			headers: { Authorization: "Bearer fake-test-token" },
		});
		const body: any = await response.json();

		expect(response.status).toBe(400);

		expectClientErrorApiResponse(
			body,
			"Eroare: 'status' accepta doar: OPEN, MATCHED, IN_PROGRESS, COMPLETED, CANCELLED, REJECTED.",
			400,
		);
	});

	it("returns all tasks when status is missing", async () => {
		authenticate();

		const mockResponse = {
			data: [
				{ id: 1, status: "OPEN" } as any,
				{ id: 2, status: "COMPLETED" } as any,
			],
			meta: { page: 1, pageSize: 10, total: 2, totalPages: 1 },
		};

		const serviceSpy = spyOn(
			HelpRequestService.prototype,
			"getPaginatedTasks",
		).mockResolvedValue(mockResponse);

		try {
			const response = await app.request("/api/tasks", {
				headers: { Authorization: "Bearer fake-test-token" },
			});
			const body: any = await response.json();

			expect(response.status).toBe(200);
			expectSuccessApiResponse(body, mockResponse, 200);
			expect(body.data.data).toHaveLength(2);

			expect(serviceSpy).toHaveBeenCalled();
		} finally {
			serviceSpy.mockRestore();
		}
	});

	it("combines status with sortBy, order, page and pageSize and keeps filtered meta", async () => {
		authenticate();

		const mockResponse = {
			data: [{ id: 11, status: "OPEN", urgency: "HIGH" } as any],
			meta: { page: 2, pageSize: 5, total: 6, totalPages: 2 },
		};

		const serviceSpy = spyOn(
			HelpRequestService.prototype,
			"getPaginatedTasks",
		).mockResolvedValue(mockResponse);

		try {
			const response = await app.request(
				"/api/tasks?status=OPEN&sortBy=urgency&order=ASC&page=2&pageSize=5",
				{
					headers: { Authorization: "Bearer fake-test-token" },
				},
			);
			const body: any = await response.json();

			expect(response.status).toBe(200);
			expectSuccessApiResponse(body, mockResponse, 200);

			expect(body.data.meta).toEqual({
				page: 2,
				pageSize: 5,
				total: 6,
				totalPages: 2,
			});
			expect(serviceSpy).toHaveBeenCalled();
		} finally {
			serviceSpy.mockRestore();
		}
	});
});
