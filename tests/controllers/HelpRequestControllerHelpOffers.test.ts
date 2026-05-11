import {
	afterAll,
	afterEach,
	beforeEach,
	describe,
	expect,
	mock,
	spyOn,
	test,
} from "bun:test";
import { Hono } from "hono";
import { ForbiddenError, NotFoundError } from "../../src/utils/Errors";
import type { ApiResponseType } from "../../src/utils/apiReponse";
import auth from "../../src/auth";

const Controller = () => (_target: unknown) => {};
mock.module("../../src/utils/controller", () => ({
	Controller,
	loadControllers: async () => {},
}));

const { HelpRequestController } = await import(
	"../../src/controllers/HelpRequestController"
);

afterAll(() => {
	mock.restore();
});

describe("GET /tasks/:id/offers endpoint", () => {
	let app: Hono;
	let getPaginatedOffersForTaskOwner: ReturnType<typeof mock>;
	let authSpy: ReturnType<typeof spyOn> | undefined;

	const authenticate = () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "owner-123", email: "owner@example.com" } as any,
			session: { id: "session-1", userId: "owner-123" } as any,
		});
	};

	beforeEach(() => {
		authSpy = undefined;
		getPaginatedOffersForTaskOwner = mock();

		const controller = new HelpRequestController({
			getPaginatedOffersForTaskOwner,
		} as any);

		app = new Hono();
		app.route("/tasks", controller.controller);
	});

	afterEach(() => {
		authSpy?.mockRestore();
		authSpy = undefined;
	});

	test("returnează 401 dacă lipsește token-ul de autentificare", async () => {
		const response = await app.request("http://localhost/tasks/1/offers", {
			method: "GET",
		});

		expect(response.status).toBe(401);
		const body = (await response.json()) as ApiResponseType<null>;
		expect(body.isUnauthorized).toBe(true);
		expect(body.statusCode).toBe(401);
		expect(getPaginatedOffersForTaskOwner).not.toHaveBeenCalled();
	});

	test("returnează 400 dacă ID-ul task-ului este invalid", async () => {
		authenticate();
		const response = await app.request("http://localhost/tasks/abc/offers", {
			method: "GET",
		});

		expect(response.status).toBe(400);
		const body = (await response.json()) as ApiResponseType<null>;
		expect(body.isClientError).toBe(true);
		expect(body.statusCode).toBe(400);
		expect(body.message).toBe("Provide a real number");
		expect(getPaginatedOffersForTaskOwner).not.toHaveBeenCalled();
	});

	test("returnează 400 pentru status (query param) invalid", async () => {
		authenticate();
		const response = await app.request(
			"http://localhost/tasks/1/offers?status=INVALID_STATUS",
			{
				method: "GET",
			},
		);

		expect(response.status).toBe(400);
		const body = (await response.json()) as ApiResponseType<null>;
		expect(body.isClientError).toBe(true);
		expect(body.statusCode).toBe(400);
		expect(getPaginatedOffersForTaskOwner).not.toHaveBeenCalled();
	});

	test("returnează 404 dacă task-ul nu există", async () => {
		authenticate();
		getPaginatedOffersForTaskOwner.mockRejectedValueOnce(
			new NotFoundError("HelpRequest", "99"),
		);

		const response = await app.request("http://localhost/tasks/99/offers", {
			method: "GET",
		});

		expect(response.status).toBe(404);
		const body = (await response.json()) as ApiResponseType<null>;
		expect(body.notFound).toBe(true);
		expect(body.statusCode).toBe(404);
		expect(getPaginatedOffersForTaskOwner).toHaveBeenCalledTimes(1);
	});

	test("returnează 403 dacă user-ul nu este owner-ul task-ului", async () => {
		authenticate();
		getPaginatedOffersForTaskOwner.mockRejectedValueOnce(
			new ForbiddenError(
				"Nu ai permisiunea de a vizualiza ofertele pentru acest task.",
			),
		);

		const response = await app.request("http://localhost/tasks/1/offers", {
			method: "GET",
		});

		expect(response.status).toBe(403);
		const body = (await response.json()) as ApiResponseType<null>;
		expect(body.isForbidden).toBe(true);
		expect(body.statusCode).toBe(403);
	});

	test("returnează 200 și lista de oferte în interiorul lui 'data' pentru un request valid", async () => {
		authenticate();
		const mockServiceResult = {
			data: [
				{
					id: 10,
					volunteerId: 5,
					message: "Pot ajuta!",
					status: "PENDING",
					createdAt: "2026-04-28T10:00:00Z",
					volunteer: {
						name: "Ion Popescu",
						trustScore: 4.8,
						averageRating: 5,
						bio: "Sunt disponibil",
					},
				},
			],
			meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
		};

		getPaginatedOffersForTaskOwner.mockResolvedValueOnce(mockServiceResult);

		const response = await app.request(
			"http://localhost/tasks/1/offers?status=PENDING&page=1&pageSize=10",
			{
				method: "GET",
			},
		);

		expect(response.status).toBe(200);

		expect(getPaginatedOffersForTaskOwner).toHaveBeenCalledTimes(1);
		expect(getPaginatedOffersForTaskOwner).toHaveBeenCalledWith(
			1,
			"owner-123",
			1,
			10,
			"PENDING",
		);

		const body = (await response.json()) as ApiResponseType<
			typeof mockServiceResult
		>;

		expect(body.statusCode).toBe(200);
		expect(body.message).toBe("Request completed successfully");
		expect(body.data).toEqual(mockServiceResult);
	});

	test("returnează 400 dacă page este 0", async () => {
		authenticate();
		const response = await app.request(
			"http://localhost/tasks/1/offers?page=0",
			{
				method: "GET",
			},
		);

		expect(response.status).toBe(400);
		const body = (await response.json()) as ApiResponseType<null>;
		expect(body.isClientError).toBe(true);
		expect(getPaginatedOffersForTaskOwner).not.toHaveBeenCalled();
	});

	test("returnează 400 dacă pageSize este 0", async () => {
		authenticate();
		const response = await app.request(
			"http://localhost/tasks/1/offers?pageSize=0",
			{
				method: "GET",
			},
		);

		expect(response.status).toBe(400);
		const body = (await response.json()) as ApiResponseType<null>;
		expect(body.isClientError).toBe(true);
		expect(getPaginatedOffersForTaskOwner).not.toHaveBeenCalled();
	});

	test("returnează 400 dacă pageSize este negativ", async () => {
		authenticate();
		const response = await app.request(
			"http://localhost/tasks/1/offers?pageSize=-5",
			{
				method: "GET",
			},
		);

		expect(response.status).toBe(400);
		const body = (await response.json()) as ApiResponseType<null>;
		expect(body.isClientError).toBe(true);
		expect(getPaginatedOffersForTaskOwner).not.toHaveBeenCalled();
	});

	test("returnează 200 și array gol pentru o pagină foarte mare (fără rezultate)", async () => {
		authenticate();
		const emptyResult = {
			data: [],
			meta: { page: 999999, pageSize: 10, total: 5, totalPages: 1 },
		};

		getPaginatedOffersForTaskOwner.mockResolvedValueOnce(emptyResult);

		const response = await app.request(
			"http://localhost/tasks/1/offers?page=999999",
			{
				method: "GET",
			},
		);

		expect(response.status).toBe(200);
		const body = (await response.json()) as ApiResponseType<typeof emptyResult>;
		expect(body.data?.data).toEqual([]);
		expect(getPaginatedOffersForTaskOwner).toHaveBeenCalled();
	});
});
