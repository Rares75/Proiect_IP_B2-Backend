import { afterEach, beforeEach, describe, expect, test, spyOn } from "bun:test";
import auth from "../../src/auth";
import { VolunteerController } from "../../src/controllers/VolunteerController";
import { NotFoundError } from "../../src/utils/Errors";

const makeApp = (mockRepository: any, mockService: any) => {
	const controller = new VolunteerController(
		mockRepository as any,
		mockService as any,
	);
	return controller.controller;
};

describe("VolunteerController /me/profile", () => {
	let app: any;
	let mockRepository: any;
	let mockService: any;
	let authSpy: ReturnType<typeof spyOn> | undefined;

	const fullProfileResponse = {
		volunteer: {
			id: 1,
			userId: "user-1",
			availability: true,
			trustScore: 4.5,
			completedTasks: 10,
		},
		profile: {
			id: 1,
			volunteerId: 1,
			skills: ["cooking", "driving"],
			maxDistanceKm: 10,
			currentLocation: { x: 27.58, y: 47.16 },
			knownLocations: [
				{
					id: 1,
					city: "Iasi",
					addressText: "Centru",
					location: { x: 27.58, y: 47.16 },
				},
			],
		},
	};

	beforeEach(() => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-1", email: "test@test.com" } as any,
			session: { userId: "user-1", id: "session-1" } as any,
		});

		mockRepository = {
			findProfileById: async () => undefined,
			findRatingsById: async () => ({ ratings: [], averageStars: null }),
		};

		mockService = {
			getVolunteerProfile: async () => fullProfileResponse,
			createVolunteerProfile: async () => ({
				id: 1,
				volunteerId: 1,
			}),
			updateVolunteerProfile: async () => ({
				id: 1,
				volunteerId: 1,
			}),
			addSkill: async () => null,
			removeSkill: async () => null,
		};

		app = makeApp(mockRepository, mockService);
	});

	afterEach(() => {
		authSpy?.mockRestore();
		authSpy = undefined;
	});

	describe("GET /me/profile", () => {
		test("should return current volunteer profile including currentLocation and knownLocations", async () => {
			const response = await app.request("/me/profile");
			const body: any = await response.json();

			expect(response.status).toBe(200);
			expect(body.data.volunteer.userId).toBe("user-1");
			expect(body.data.profile.maxDistanceKm).toBe(10);
			expect(body.data.profile.currentLocation).toEqual({
				x: 27.58,
				y: 47.16,
			});
			expect(body.data.profile.knownLocations).toEqual([
				{
					id: 1,
					city: "Iasi",
					addressText: "Centru",
					location: { x: 27.58, y: 47.16 },
				},
			]);
		});

		test("should return 401 when session is missing", async () => {
			authSpy?.mockRestore();
			authSpy = spyOn(auth.api, "getSession").mockResolvedValue(null as any);

			const response = await app.request("/me/profile");

			expect(response.status).toBe(401);
		});

		test("should return 404 when volunteer is not found", async () => {
			mockService.getVolunteerProfile = async () => {
				throw new NotFoundError("Volunteer", "user-1");
			};
			app = makeApp(mockRepository, mockService);

			const response = await app.request("/me/profile");
			const body: any = await response.json();

			expect(response.status).toBe(404);
			expect(body.notFound).toBe(true);
		});
	});

	describe("POST /me/profile", () => {
		test("should create and return current volunteer profile with settings", async () => {
			const payload = {
				skills: ["cooking"],
				maxDistanceKm: 10,
				currentLocation: { x: 27.58, y: 47.16 },
				knownLocations: [
					{
						city: "Iasi",
						addressText: "Centru",
						location: { x: 27.58, y: 47.16 },
					},
				],
				availability: true,
			};

			let createPayload: unknown;
			mockService.createVolunteerProfile = async (_userId: string, data: any) => {
				createPayload = data;
				return {
					id: 1,
					volunteerId: 1,
				};
			};
			app = makeApp(mockRepository, mockService);

			const response = await app.request("/me/profile", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			const body: any = await response.json();

			expect(response.status).toBe(201);
			expect(createPayload).toEqual(payload);
			expect(body.data.profile.currentLocation).toEqual(payload.currentLocation);
			expect(body.data.profile.knownLocations).toEqual([
				{
					id: 1,
					city: "Iasi",
					addressText: "Centru",
					location: { x: 27.58, y: 47.16 },
				},
			]);
		});

		test("should return 400 for invalid profile body", async () => {
			const response = await app.request("/me/profile", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					maxDistanceKm: -1,
				}),
			});
			const body: any = await response.json();

			expect(response.status).toBe(400);
			expect(body.isClientError).toBe(true);
		});
	});

	describe("PUT /me/profile", () => {
		test("should update and return current volunteer profile with settings", async () => {
			const payload = {
				maxDistanceKm: 20,
				currentLocation: { x: 27.6, y: 47.1 },
				knownLocations: [
					{
						city: "Iasi",
						addressText: "Copou",
						location: { x: 27.6, y: 47.1 },
					},
				],
			};

			let updatePayload: unknown;
			mockService.updateVolunteerProfile = async (_userId: string, data: any) => {
				updatePayload = data;
				return {
					id: 1,
					volunteerId: 1,
				};
			};
			mockService.getVolunteerProfile = async () => ({
				...fullProfileResponse,
				profile: {
					...fullProfileResponse.profile,
					maxDistanceKm: 20,
					currentLocation: { x: 27.6, y: 47.1 },
					knownLocations: [
						{
							id: 2,
							city: "Iasi",
							addressText: "Copou",
							location: { x: 27.6, y: 47.1 },
						},
					],
				},
			});
			app = makeApp(mockRepository, mockService);

			const response = await app.request("/me/profile", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			const body: any = await response.json();

			expect(response.status).toBe(200);
			expect(updatePayload).toEqual(payload);
			expect(body.data.profile.maxDistanceKm).toBe(20);
			expect(body.data.profile.currentLocation).toEqual({
				x: 27.6,
				y: 47.1,
			});
			expect(body.data.profile.knownLocations[0].addressText).toBe("Copou");
		});

		test("should return 404 when volunteer profile is missing", async () => {
			mockService.updateVolunteerProfile = async () => {
				throw new NotFoundError("VolunteerProfile", "1");
			};
			app = makeApp(mockRepository, mockService);

			const response = await app.request("/me/profile", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ maxDistanceKm: 10 }),
			});
			const body: any = await response.json();

			expect(response.status).toBe(404);
			expect(body.notFound).toBe(true);
		});
	});
});
