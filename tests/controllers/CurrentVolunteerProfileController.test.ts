import { afterEach, beforeEach, describe, expect, test, spyOn } from "bun:test";
import auth from "../../src/auth";
import { CurrentVolunteerProfileController } from "../../src/controllers/CurrentVolunteerProfileController";

const makeApp = (mockRepository: any) => {
	const controller = new CurrentVolunteerProfileController(
		mockRepository as any,
	);
	return controller.controller;
};

describe("CurrentVolunteerProfileController", () => {
	let app: any;
	let mockRepository: any;
	let authSpy: ReturnType<typeof spyOn> | undefined;

	const mockProfile = {
		volunteerId: 12,
		maxDistanceKm: 15,
		currentLocation: { x: 27.58, y: 47.16 },
		knownLocations: [
			{
				id: 1,
				city: "Iasi",
				addressText: "Centru",
				location: { x: 27.58, y: 47.16 },
			},
		],
	};

	beforeEach(() => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-1", email: "test@test.com" } as any,
			session: { userId: "user-1", id: "session-1" } as any,
		});

		mockRepository = {
			findCurrentProfileByUserId: async () => mockProfile,
			saveCurrentProfileByUserId: async () => mockProfile,
		};

		app = makeApp(mockRepository);
	});

	afterEach(() => {
		authSpy?.mockRestore();
		authSpy = undefined;
	});

	describe("GET /me/volunteer-profile", () => {
		test("should return 200 with the current volunteer profile", async () => {
			const response = await app.request("/me/volunteer-profile");
			const body = (await response.json()) as any;

			expect(response.status).toBe(200);
			expect(body.data).toEqual(mockProfile);
			expect(body.isUnauthorized).toBe(false);
			expect(body.notFound).toBe(false);
		});

		test("should return 401 when session is missing", async () => {
			authSpy?.mockRestore();
			authSpy = spyOn(auth.api, "getSession").mockResolvedValue(null as any);

			const response = await app.request("/me/volunteer-profile");

			expect(response.status).toBe(401);
		});

		test("should return 404 when volunteer profile does not exist", async () => {
			mockRepository.findCurrentProfileByUserId = async () => undefined;
			app = makeApp(mockRepository);

			const response = await app.request("/me/volunteer-profile");
			const body = (await response.json()) as any;

			expect(response.status).toBe(404);
			expect(body.notFound).toBe(true);
		});

		test("should return 500 on unexpected repository error", async () => {
			mockRepository.findCurrentProfileByUserId = async () => {
				throw new Error("Database error");
			};
			app = makeApp(mockRepository);

			const response = await app.request("/me/volunteer-profile");
			const body = (await response.json()) as any;

			expect(response.status).toBe(500);
			expect(body.isServerError).toBe(true);
		});
	});

	describe("PUT /me/volunteer-profile", () => {
		test("should return 200 and save the current volunteer profile", async () => {
			const payload = {
				maxDistanceKm: 20,
				currentLocation: { x: 27.61, y: 47.14 },
				knownLocations: [
					{
						city: "Iasi",
						addressText: "Pacurari",
						location: { x: 27.61, y: 47.14 },
					},
				],
			};

			let receivedUserId: string | undefined;
			let receivedPayload: unknown;
			mockRepository.saveCurrentProfileByUserId = async (
				userId: string,
				data: unknown,
			) => {
				receivedUserId = userId;
				receivedPayload = data;
				return {
					volunteerId: 12,
					...payload,
				};
			};
			app = makeApp(mockRepository);

			const response = await app.request("/me/volunteer-profile", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			const body = (await response.json()) as any;

			expect(response.status).toBe(200);
			expect(receivedUserId).toBe("user-1");
			expect(receivedPayload).toEqual(payload);
			expect(body.data).toEqual({
				volunteerId: 12,
				...payload,
			});
		});

		test("should return 400 for invalid body", async () => {
			const response = await app.request("/me/volunteer-profile", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					maxDistanceKm: -1,
					currentLocation: null,
					knownLocations: [],
				}),
			});
			const body = (await response.json()) as any;

			expect(response.status).toBe(400);
			expect(body.isClientError).toBe(true);
			expect(body.message).toBe("Failed to validate input");
		});

		test("should return 401 when session is missing", async () => {
			authSpy?.mockRestore();
			authSpy = spyOn(auth.api, "getSession").mockResolvedValue(null as any);

			const response = await app.request("/me/volunteer-profile", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					maxDistanceKm: 10,
					currentLocation: null,
					knownLocations: [],
				}),
			});

			expect(response.status).toBe(401);
		});

		test("should return 404 when volunteer profile cannot be saved because volunteer does not exist", async () => {
			mockRepository.saveCurrentProfileByUserId = async () => undefined;
			app = makeApp(mockRepository);

			const response = await app.request("/me/volunteer-profile", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					maxDistanceKm: 10,
					currentLocation: null,
					knownLocations: [],
				}),
			});
			const body = (await response.json()) as any;

			expect(response.status).toBe(404);
			expect(body.notFound).toBe(true);
		});

		test("should return 500 on unexpected repository error", async () => {
			mockRepository.saveCurrentProfileByUserId = async () => {
				throw new Error("Database error");
			};
			app = makeApp(mockRepository);

			const response = await app.request("/me/volunteer-profile", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					maxDistanceKm: 10,
					currentLocation: null,
					knownLocations: [],
				}),
			});
			const body = (await response.json()) as any;

			expect(response.status).toBe(500);
			expect(body.isServerError).toBe(true);
		});
	});
});
