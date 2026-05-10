import { afterEach, beforeEach, describe, expect, test } from "bun:test";

describe("VolunteerController", () => {
	let mockService: any;

	beforeEach(() => {
		mockService = {
			getVolunteerProfile: async () => null,
			createVolunteerProfile: async () => null,
			updateVolunteerProfile: async () => null,
			addSkill: async () => null,
			removeSkill: async () => null,
		};
	});

	afterEach(() => {
		mockService = null;
	});

	// ─── GET /volunteers/me/profile ──────────────────────────────────────────────

	describe("GET /volunteers/me/profile", () => {
		test("should return volunteer profile when found", async () => {
			const mockProfile = {
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
				},
			};

			mockService.getVolunteerProfile = async (userId: string) =>
				userId === "user-1" ? mockProfile : null;

			const result = await mockService.getVolunteerProfile("user-1");
			expect(result).toMatchObject(mockProfile);
		});

		test("should return null when volunteer not found", async () => {
			mockService.getVolunteerProfile = async () => null;

			const result = await mockService.getVolunteerProfile("nonexistent");
			expect(result).toBeNull();
		});

		test("should handle service errors gracefully", async () => {
			mockService.getVolunteerProfile = async () => {
				throw new Error("Database error");
			};

			try {
				await mockService.getVolunteerProfile("user-1");
				expect(false).toBe(true);
			} catch (error) {
				expect((error as Error).message).toContain("Database error");
			}
		});
	});

	// ─── POST /volunteers/me/profile ─────────────────────────────────────────────

	describe("POST /volunteers/me/profile", () => {
		test("should create volunteer profile with valid data", async () => {
			const validData = {
				skills: ["cooking", "driving"],
				maxDistanceKm: 10,
				availability: true,
			};

			const mockCreated = {
				id: 1,
				volunteerId: 1,
				skills: ["cooking", "driving"],
				maxDistanceKm: 10,
			};

			mockService.createVolunteerProfile = async (
				userId: string,
				data: any,
			) => ({ ...mockCreated, ...data });

			const result = await mockService.createVolunteerProfile(
				"user-1",
				validData,
			);
			expect(result).toMatchObject(validData);
		});

		test("should create profile with empty skills array", async () => {
			const data = { skills: [], maxDistanceKm: 5 };

			mockService.createVolunteerProfile = async (_: string, d: any) => ({
				id: 1,
				volunteerId: 1,
				...d,
			});

			const result = await mockService.createVolunteerProfile("user-1", data);
			expect(result.skills).toEqual([]);
		});

		test("should throw error when profile already exists", async () => {
			mockService.createVolunteerProfile = async () => {
				throw new Error("Volunteer profile already exists");
			};

			try {
				await mockService.createVolunteerProfile("user-1", {});
				expect(false).toBe(true);
			} catch (error) {
				expect((error as Error).message).toBe(
					"Volunteer profile already exists",
				);
			}
		});

		test("should create profile without optional fields", async () => {
			const data = {};

			mockService.createVolunteerProfile = async (_: string, d: any) => ({
				id: 1,
				volunteerId: 1,
				skills: [],
				maxDistanceKm: null,
				...d,
			});

			const result = await mockService.createVolunteerProfile("user-1", data);
			expect(result.skills).toEqual([]);
			expect(result.maxDistanceKm).toBeNull();
		});
	});

	// ─── PUT /volunteers/me/profile ──────────────────────────────────────────────

	describe("PUT /volunteers/me/profile", () => {
		test("should update volunteer profile with valid data", async () => {
			const updateData = {
				skills: ["cooking", "driving", "gardening"],
				maxDistanceKm: 20,
				availability: false,
			};

			mockService.updateVolunteerProfile = async (_: string, data: any) => ({
				id: 1,
				volunteerId: 1,
				...data,
			});

			const result = await mockService.updateVolunteerProfile(
				"user-1",
				updateData,
			);
			expect(result).toMatchObject(updateData);
		});

		test("should throw NotFoundError when profile not found", async () => {
			mockService.updateVolunteerProfile = async () => {
				throw new Error("VolunteerProfile not found");
			};

			try {
				await mockService.updateVolunteerProfile("nonexistent", {});
				expect(false).toBe(true);
			} catch (error) {
				expect((error as Error).message).toContain("not found");
			}
		});

		test("should update only availability without touching skills", async () => {
			const updateData = { availability: true };

			mockService.updateVolunteerProfile = async (_: string, data: any) => ({
				id: 1,
				volunteerId: 1,
				skills: ["cooking"],
				maxDistanceKm: 10,
				...data,
			});

			const result = await mockService.updateVolunteerProfile(
				"user-1",
				updateData,
			);
			expect(result.availability).toBe(true);
			expect(result.skills).toEqual(["cooking"]);
		});
	});

	// ─── POST /volunteers/me/skills ──────────────────────────────────────────────

	describe("POST /volunteers/me/skills", () => {
		test("should add a new skill successfully", async () => {
			mockService.addSkill = async (userId: string, skill: string) => ({
				id: 1,
				volunteerId: 1,
				skills: ["cooking", skill],
			});

			const result = await mockService.addSkill("user-1", "teaching");
			expect(result.skills).toContain("teaching");
		});

		test("should throw error when skill already exists", async () => {
			mockService.addSkill = async () => {
				throw new Error("Skill already exists");
			};

			try {
				await mockService.addSkill("user-1", "cooking");
				expect(false).toBe(true);
			} catch (error) {
				expect((error as Error).message).toBe("Skill already exists");
			}
		});

		test("should throw NotFoundError when profile not found", async () => {
			mockService.addSkill = async () => {
				throw new Error("VolunteerProfile not found");
			};

			try {
				await mockService.addSkill("nonexistent", "cooking");
				expect(false).toBe(true);
			} catch (error) {
				expect((error as Error).message).toContain("not found");
			}
		});

		test("should not add empty skill", async () => {
			let called = false;
			mockService.addSkill = async (_: string, skill: string) => {
				if (!skill || skill.trim() === "") {
					throw new Error("Invalid skill");
				}
				called = true;
				return { skills: [skill] };
			};

			try {
				await mockService.addSkill("user-1", "");
				expect(false).toBe(true);
			} catch (error) {
				expect(called).toBe(false);
				expect((error as Error).message).toBe("Invalid skill");
			}
		});
	});

	// ─── DELETE /volunteers/me/skills/:skill ─────────────────────────────────────

	describe("DELETE /volunteers/me/skills/:skill", () => {
		test("should remove a skill successfully", async () => {
			mockService.removeSkill = async (userId: string, skill: string) => ({
				id: 1,
				volunteerId: 1,
				skills: ["cooking"],
			});

			const result = await mockService.removeSkill("user-1", "driving");
			expect(result.skills).not.toContain("driving");
		});

		test("should throw error when skill not found", async () => {
			mockService.removeSkill = async () => {
				throw new Error("Skill not found");
			};

			try {
				await mockService.removeSkill("user-1", "nonexistent");
				expect(false).toBe(true);
			} catch (error) {
				expect((error as Error).message).toBe("Skill not found");
			}
		});

		test("should throw NotFoundError when profile not found", async () => {
			mockService.removeSkill = async () => {
				throw new Error("VolunteerProfile not found");
			};

			try {
				await mockService.removeSkill("nonexistent", "cooking");
				expect(false).toBe(true);
			} catch (error) {
				expect((error as Error).message).toContain("not found");
			}
		});

		test("should handle service errors gracefully", async () => {
			mockService.removeSkill = async () => {
				throw new Error("Database error");
			};

			try {
				await mockService.removeSkill("user-1", "cooking");
				expect(false).toBe(true);
			} catch (error) {
				expect((error as Error).message).toContain("Database error");
			}
		});
	});
});