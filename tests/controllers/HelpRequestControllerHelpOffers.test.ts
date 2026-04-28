import { beforeEach, describe, expect, mock, test } from "bun:test";
import { Hono } from "hono";
import { ForbiddenError, NotFoundError } from "../../src/utils/Errors";

const Controller = () => (_target: unknown) => {};
mock.module("../../src/utils/controller", () => ({
	Controller,
}));

// 2. Mock inteligent pentru Auth Middleware
mock.module("../../src/middlware/authMiddleware", () => ({
	authMiddleware: async (c: any, next: () => Promise<void>) => {
		const authHeader = c.req.header("Authorization");
		if (authHeader === "Bearer valid-token") {
			c.set("user", { id: "owner-123" }); // Simulăm că owner-123 e logat
			await next();
		} else {
			return c.json({ error: "Neautentificat" }, 401);
		}
	},
}));

const { HelpRequestController } = await import(
	"../../src/controllers/HelpRequestController"
);

describe("GET /tasks/:id/offers endpoint", () => {
	let app: Hono;
	let getPaginatedOffersForTaskOwner: ReturnType<typeof mock>;

	beforeEach(() => {
		// Inițializăm mock-ul pentru metoda din service
		getPaginatedOffersForTaskOwner = mock();

		// Injectăm mock-ul în controller
		const controller = new HelpRequestController({
			getPaginatedOffersForTaskOwner,
		} as any);

		app = new Hono();
		// Hono mapează controllerul pe /tasks (la fel ca în exemplu)
		app.route("/tasks", controller.controller);
	});

	test("returnează 401 dacă lipsește token-ul de autentificare", async () => {
		const response = await app.request("http://localhost/tasks/1/offers", {
			method: "GET",
			// Fără header-ul Authorization
		});

		expect(response.status).toBe(401);
		const body = (await response.json()) as { error: string };
		expect(body.error).toBe("Neautentificat");
		expect(getPaginatedOffersForTaskOwner).not.toHaveBeenCalled();
	});

	test("returnează 400 dacă ID-ul task-ului este invalid", async () => {
		const response = await app.request("http://localhost/tasks/abc/offers", {
			method: "GET",
			headers: { Authorization: "Bearer valid-token" },
		});

		expect(response.status).toBe(400);
		const body = (await response.json()) as { error: string };
		expect(body.error).toContain("invalid id");
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
		const body = (await response.json()) as { error: string };
		expect(body.error).toContain("Invalid status");
		expect(getPaginatedOffersForTaskOwner).not.toHaveBeenCalled();
	});

	test("returnează 404 dacă task-ul nu există", async () => {
		// Facem service-ul să arunce o eroare de NotFound
		getPaginatedOffersForTaskOwner.mockRejectedValueOnce(
			new NotFoundError("HelpRequest", "99"),
		);

		const response = await app.request("http://localhost/tasks/99/offers", {
			method: "GET",
			headers: { Authorization: "Bearer valid-token" },
		});

		expect(response.status).toBe(404);
		expect(getPaginatedOffersForTaskOwner).toHaveBeenCalledTimes(1);
	});

	test("returnează 403 dacă user-ul nu este owner-ul task-ului", async () => {
		// Facem service-ul să arunce o eroare de Forbidden
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
		const body = (await response.json()) as { error: string };
		expect(body.error).toContain("Nu ai permisiunea");
	});

	test("returnează 200 și lista de oferte pentru un request valid", async () => {
		const mockResult = {
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

		// Service-ul returnează datele de succes
		getPaginatedOffersForTaskOwner.mockResolvedValueOnce(mockResult);

		const response = await app.request(
			"http://localhost/tasks/1/offers?status=PENDING&page=1&pageSize=10",
			{
				method: "GET",
				headers: { Authorization: "Bearer valid-token" },
			},
		);

		expect(response.status).toBe(200);

		// Verificăm ce a primit service-ul
		expect(getPaginatedOffersForTaskOwner).toHaveBeenCalledTimes(1);
		expect(getPaginatedOffersForTaskOwner).toHaveBeenCalledWith(
			1, // taskId
			"owner-123", // requesterUserId (din middleware-ul mockat)
			1, // page
			10, // pageSize
			"PENDING", // status
		);

		// Verificăm structura de ieșire
		const body = (await response.json()) as typeof mockResult;
		expect(body).toEqual(mockResult);
	});
});
