/// <reference types="bun-types" />
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	mock,
	spyOn,
	test,
} from "bun:test";
import { Hono } from "hono";
import auth from "../../src/auth";

const Controller = () => (_target: unknown) => {};

mock.module("../../src/utils/controller", () => ({
	Controller,
}));

const { OffersController } = await import(
	"../../src/controllers/OffersController"
);

describe("GET /offers", () => {
	let app: Hono;
	let authSpy: ReturnType<typeof spyOn> | undefined;
	let volunteerLookupResult: any;
	let offersResult: any;
	let findByUserId: ReturnType<typeof mock>;
	let findOffersByVolunteer: ReturnType<typeof mock>;

	const setupAuthenticatedVolunteer = () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-1", email: "volunteer@example.com" } as any,
			session: { id: "session-1" } as any,
		});
	};

	beforeEach(() => {
		volunteerLookupResult = { id: 7, userId: "user-1" };
		offersResult = {
			offers: [
				{
					id: 1,
					volunteerId: 7,
					helpRequestId: 33,
					message: "Pot ajuta cu transportul",
					status: "PENDING",
					createdAt: new Date("2025-01-10T10:00:00.000Z"),
					task: {
						id: 33,
						title: "Ajutor pentru drum la spital",
						urgency: "HIGH",
						status: "OPEN",
						description: "Este nevoie de transport dimineata",
					},
				},
			],
			totalCount: 1,
		};

		findByUserId = mock(async () => volunteerLookupResult);
		findOffersByVolunteer = mock(async () => offersResult);

		const controller = new OffersController({
			findByUserId,
			findOffersByVolunteer,
		} as any);

		app = new Hono();
		app.route("/offers", controller.controller);
	});

	afterEach(() => {
		authSpy?.mockRestore();
	});

	test("returneaza 401 cand nu exista sesiune", async () => {
		// Arrange
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue(null);

		// Act
		const response = await app.request("http://localhost/offers");
		const body: any = await response.json();

		// Assert
		expect(response.status).toBe(401);
		expect(body.error).toBe("Unauthorized");
		expect(findByUserId).not.toHaveBeenCalled();
		expect(findOffersByVolunteer).not.toHaveBeenCalled();
	});

	test("returneaza 403 cand userul autentificat nu este voluntar", async () => {
		// Arrange
		setupAuthenticatedVolunteer();
		volunteerLookupResult = undefined;

		// Act
		const response = await app.request("http://localhost/offers", {
			headers: { Authorization: "Bearer fake-token" },
		});
		const body: any = await response.json();

		// Assert: envelope produced by sendApiResponse
		expect(response.status).toBe(403);
		expect(body.data).toBeNull();
		expect(body.message).toBe("Volunteer not found");
		expect(body.notFound).toBe(true);
		expect(body.isUnauthorized).toBe(false);
		expect(body.isServerError).toBe(false);
		expect(body.isClientError).toBe(false);
		expect(body.app).toBeTruthy();
		expect(body.statusCode).toBe(403);
		expect(findOffersByVolunteer).not.toHaveBeenCalled();
	});

	test("returneaza 400 pentru status invalid", async () => {
		// Arrange
		setupAuthenticatedVolunteer();

		// Act
		const response = await app.request(
			"http://localhost/offers?status=INVALID",
			{
				headers: { Authorization: "Bearer fake-token" },
			},
		);
		const body: any = await response.json();

		// Assert
		expect(response.status).toBe(400);
		expect(body.message).toContain("accepta doar");
		expect(findOffersByVolunteer).not.toHaveBeenCalled();
	});

	test("returneaza 200 si ofertele proprii pentru voluntarul autentificat", async () => {
		// Arrange
		setupAuthenticatedVolunteer();

		// Act
		const response = await app.request("http://localhost/offers", {
			headers: { Authorization: "Bearer fake-token" },
		});
		const body: any = await response.json();

		// Assert
		expect(response.status).toBe(200);
		expect(findByUserId).toHaveBeenCalledWith("user-1");
		expect(findOffersByVolunteer).toHaveBeenCalledWith(7, {
			page: 1,
			pageSize: 10,
			status: undefined,
		});
		expect(body.data.data).toHaveLength(1);
		expect(body.data.data[0]).toMatchObject({
			id: 1,
			volunteerId: 7,
			helpRequestId: 33,
			status: "PENDING",
			task: {
				id: 33,
				title: "Ajutor pentru drum la spital",
				urgency: "HIGH",
				status: "OPEN",
				description: "Este nevoie de transport dimineata",
			},
		});
		expect(body.data.meta).toMatchObject({
			currentPage: 1,
			pageSize: 10,
			totalItems: 1,
			totalPages: 1,
			hasNextPage: false,
			hasPreviousPage: false,
		});
	});

	test("returneaza 200 si meta corect cand voluntarul nu are oferte", async () => {
		// Arrange
		setupAuthenticatedVolunteer();
		offersResult = {
			offers: [],
			totalCount: 0,
		};

		// Act
		const response = await app.request("http://localhost/offers", {
			headers: { Authorization: "Bearer fake-token" },
		});
		const body: any = await response.json();

		// Assert
		expect(response.status).toBe(200);
		expect(body.data.data).toEqual([]);
		expect(body.data.meta).toMatchObject({
			currentPage: 1,
			pageSize: 10,
			totalItems: 0,
			totalPages: 0,
			hasNextPage: false,
			hasPreviousPage: false,
		});
	});

	test("returneaza meta de paginare corecta pentru page=2&pageSize=5", async () => {
		// Arrange
		setupAuthenticatedVolunteer();
		offersResult = {
			offers: [
				{
					id: 2,
					volunteerId: 7,
					helpRequestId: 41,
					message: null,
					status: "ACCEPTED",
					createdAt: new Date("2025-01-11T10:00:00.000Z"),
					task: {
						id: 41,
						title: "Cumparaturi urgente",
						urgency: "LOW",
						status: "OPEN",
						description: null,
					},
				},
			],
			totalCount: 12,
		};

		// Act
		const response = await app.request(
			"http://localhost/offers?page=2&pageSize=5",
			{
				headers: { Authorization: "Bearer fake-token" },
			},
		);
		const body: any = await response.json();

		// Assert
		expect(response.status).toBe(200);
		expect(findOffersByVolunteer).toHaveBeenCalledWith(7, {
			page: 2,
			pageSize: 5,
			status: undefined,
		});
		expect(body.data.meta).toMatchObject({
			currentPage: 2,
			pageSize: 5,
			totalItems: 12,
			totalPages: 3,
			hasNextPage: true,
			hasPreviousPage: true,
		});
		expect(body.data.data[0].task).toMatchObject({
			title: "Cumparaturi urgente",
			urgency: "LOW",
		});
	});
});
