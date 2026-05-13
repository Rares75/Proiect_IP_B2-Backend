/// <reference types="bun-types" />
import { describe, expect, it, beforeAll, spyOn } from "bun:test";
import { join } from "node:path";
import app from "../../src/app";
import { loadControllers } from "../../src/utils/controller";
import { VolunteerRepository } from "../../src/db/repositories/volunteer.repository";

describe("GET /api/volunteers/:id", () => {
	beforeAll(async () => {
		const controllersPath = join(
			(import.meta as any).dir,
			"../../src/controllers",
		);
		await loadControllers(controllersPath);
	});

	it("ar trebui sa returneze 400 pentru TOATE tipurile de ID-uri invalide", async () => {
		const badInputs = [
			"abc",
			"@#!",
			"-5",
			"0",
			"3.14",
			"999999999999999999999999",
		];

		for (const badId of badInputs) {
			const response = await app.request(`/api/volunteers/${badId}`);
			const body: any = await response.json();

			expect(response.status).toBe(400);
			expect(body.error).toBeDefined();
		}
	});

	it("ar trebui sa returneze 404 pentru un voluntar care nu exista", async () => {
		const mockNotFound = spyOn(
			VolunteerRepository.prototype,
			"findProfileById",
		).mockResolvedValue(undefined as any);

		try {
			const response = await app.request("/api/volunteers/999999");
			const body: any = await response.json();

			expect(response.status).toBe(404);
			expect(body.error).toContain("999999");
		} finally {
			mockNotFound.mockRestore();
		}
	});

	it("ar trebui sa returneze 200 si profilul complet pentru un voluntar valid", async () => {
		const mockProfile = {
			volunteerId: 1,
			userId: "user-abc",
			availability: true,
			trustScore: 4.5,
			completedTasks: 10,
			name: "Ion Popescu",
			email: "ion@example.com",
			phone: "0744000000",
			image: null,
			hiddenIdentity: false,
			bio: "Voluntar activ",
			languages: ["ro", "en"],
			skills: ["first-aid"],
			maxDistanceKm: 20,
		};

		const mockRatings = {
			ratings: [
				{
					id: 1,
					stars: 5,
					comment: "Excelent",
					createdAt: new Date(),
					writtenByUserId: "user-xyz",
				},
			],
			averageStars: 5,
		};

		const profileSpy = spyOn(
			VolunteerRepository.prototype,
			"findProfileById",
		).mockResolvedValue(mockProfile as any);

		const ratingsSpy = spyOn(
			VolunteerRepository.prototype,
			"findRatingsById",
		).mockResolvedValue(mockRatings);

		try {
			const response = await app.request("/api/volunteers/1");
			const body: any = await response.json();

			expect(response.status).toBe(200);
			expect(body.id).toBe(1);
			expect(body.availability).toBe(true);
			expect(body.trustScore).toBe(4.5);
			expect(body.completedTasks).toBe(10);
			expect(body.user).toBeDefined();
			expect(body.user.name).toBe("Ion Popescu");
			expect(body.profile).toBeDefined();
			expect(body.profile.languages).toBeArray();
			expect(body.profile.skills).toBeArray();
			expect(body.ratingInfo).toBeDefined();
			expect(body.ratingInfo.averageStars).toBe(5);
			expect(body.ratingInfo.totalRatings).toBe(1);
		} finally {
			profileSpy.mockRestore();
			ratingsSpy.mockRestore();
		}
	});

	it("ar trebui sa ascunda datele personale daca hiddenIdentity este true", async () => {
		const mockProfile = {
			volunteerId: 2,
			userId: "user-hidden",
			availability: false,
			trustScore: 3.0,
			completedTasks: 5,
			name: "Anonim",
			email: "anonim@example.com",
			phone: "0700000000",
			image: null,
			hiddenIdentity: true,
			bio: null,
			languages: [],
			skills: [],
			maxDistanceKm: null,
		};

		const profileSpy = spyOn(
			VolunteerRepository.prototype,
			"findProfileById",
		).mockResolvedValue(mockProfile as any);

		const ratingsSpy = spyOn(
			VolunteerRepository.prototype,
			"findRatingsById",
		).mockResolvedValue({ ratings: [], averageStars: null });

		try {
			const response = await app.request("/api/volunteers/2");
			const body: any = await response.json();

			expect(response.status).toBe(200);
			expect(body.user.name).toBeNull();
			expect(body.user.email).toBeNull();
			expect(body.user.phone).toBeNull();
		} finally {
			profileSpy.mockRestore();
			ratingsSpy.mockRestore();
		}
	});

	it("ar trebui sa returneze averageStars null si array gol daca voluntarul nu are ratinguri", async () => {
		const mockProfile = {
			volunteerId: 3,
			userId: "user-noratings",
			availability: true,
			trustScore: 0,
			completedTasks: 0,
			name: "Nou Venit",
			email: "nou@example.com",
			phone: null,
			image: null,
			hiddenIdentity: false,
			bio: null,
			languages: [],
			skills: [],
			maxDistanceKm: null,
		};

		const profileSpy = spyOn(
			VolunteerRepository.prototype,
			"findProfileById",
		).mockResolvedValue(mockProfile as any);

		const ratingsSpy = spyOn(
			VolunteerRepository.prototype,
			"findRatingsById",
		).mockResolvedValue({ ratings: [], averageStars: null });

		try {
			const response = await app.request("/api/volunteers/3");
			const body: any = await response.json();

			expect(response.status).toBe(200);
			expect(body.ratingInfo.averageStars).toBeNull();
			expect(body.ratingInfo.totalRatings).toBe(0);
			expect(body.ratingInfo.ratings).toEqual([]);
		} finally {
			profileSpy.mockRestore();
			ratingsSpy.mockRestore();
		}
	});

	it("ar trebui sa returneze 500 daca pica baza de date", async () => {
		const mockError = spyOn(
			VolunteerRepository.prototype,
			"findProfileById",
		).mockRejectedValue(new Error("DB crash simulat!"));

		try {
			const response = await app.request("/api/volunteers/1");
			expect(response.status).toBe(500);
		} finally {
			mockError.mockRestore();
		}
	});
});
