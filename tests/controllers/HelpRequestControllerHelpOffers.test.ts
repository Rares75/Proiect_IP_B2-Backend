import { beforeEach, describe, expect, mock, test } from "bun:test";
import { Hono } from "hono";
import { ForbiddenError, NotFoundError } from "../../src/utils/Errors";
import type { ApiResponseType } from "../../src/utils/apiReponse";

const Controller = () => (_target: unknown) => {};
mock.module("../../src/utils/controller", () => ({
	Controller,
}));

mock.module("../../src/middlware/authMiddleware", () => {
	const authMiddlware = async (c: any, next: () => Promise<void>) => {
		const authHeader = c.req.header("Authorization");
		if (authHeader === "Bearer valid-token") {
			c.set("session", { userId: "owner-123" });
			await next();
		} else {
			return c.json(
				{
					data: null,
					message: "Unauthorized",
					notFound: false,
					isUnauthorized: true,
					isServerError: false,
					isForbidden: false,
					isClientError: false,
					app: { url: process.env.SERVER_URL || "" },
					statusCode: 401,
				},
				401,
			);
		}
	};

	return {
		authMiddlware,
		authMiddleware: authMiddlware,
	};
});

const { HelpRequestController } = await import(
	"../../src/controllers/HelpRequestController"
);

describe("GET /tasks/:id/offers endpoint", () => {
	let app: Hono;
	let getPaginatedOffersForTaskOwner: ReturnType<typeof mock>;

	beforeEach(() => {
		getPaginatedOffersForTaskOwner = mock();

		const controller = new HelpRequestController({
			getPaginatedOffersForTaskOwner,
		} as any);

		app = new Hono();
		app.route("/tasks", controller.controller);
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
		const response = await app.request("http://localhost/tasks/abc/offers", {
			method: "GET",
			headers: { Authorization: "Bearer valid-token" },
		});

		expect(response.status).toBe(400);
		const body = (await response.json()) as ApiResponseType<null>;
		expect(body.isClientError).toBe(true);
		expect(body.statusCode).toBe(400);
		expect(body.message).toBe("Invalid request");
		expect(getPaginatedOffersForTaskOwner).not.toHaveBeenCalled();
	});

	test("returnează 400 pentru status (query param) invalid", async () => {
		const response = await app.request(
			"http://localhost/tasks/1/offers?status=INVALID_STATUS",
			{
				method: "GET",
				headers: { Authorization: "Bearer valid-token" },
			},
		);

		expect(response.status).toBe(400);
		const body = (await response.json()) as ApiResponseType<null>;
		expect(body.isClientError).toBe(true);
		expect(body.statusCode).toBe(400);
		expect(getPaginatedOffersForTaskOwner).not.toHaveBeenCalled();
	});

	test("returnează 404 dacă task-ul nu există", async () => {
		getPaginatedOffersForTaskOwner.mockRejectedValueOnce(
			new NotFoundError("HelpRequest", "99"),
		);

		const response = await app.request("http://localhost/tasks/99/offers", {
			method: "GET",
			headers: { Authorization: "Bearer valid-token" },
		});

		expect(response.status).toBe(404);
		const body = (await response.json()) as ApiResponseType<null>;
		expect(body.notFound).toBe(true);
		expect(body.statusCode).toBe(404);
		expect(getPaginatedOffersForTaskOwner).toHaveBeenCalledTimes(1);
	});

	test("returnează 403 dacă user-ul nu este owner-ul task-ului", async () => {
		getPaginatedOffersForTaskOwner.mockRejectedValueOnce(
			new ForbiddenError(
				"Nu ai permisiunea de a vizualiza ofertele pentru acest task.",
			),
		);

		const response = await app.request("http://localhost/tasks/1/offers", {
			method: "GET",
			headers: { Authorization: "Bearer valid-token" },
		});

		expect(response.status).toBe(403);
		const body = (await response.json()) as ApiResponseType<null>;
		expect(body.isForbidden).toBe(true);
		expect(body.statusCode).toBe(403);
	});

	test("returnează 200 și lista de oferte în interiorul lui 'data' pentru un request valid", async () => {
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
				headers: { Authorization: "Bearer valid-token" },
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
});
