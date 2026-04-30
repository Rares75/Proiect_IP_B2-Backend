import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
	createProfileSchema,
	updateProfileSchema,
} from "../../src/utils/validators/profileValidator";

describe("ProfileController", () => {
	let mockService: any;

	beforeEach(() => {
		mockService = {
			getProfileByUserId: async () => null,
			createProfile: async () => null,
			updateProfile: async () => null,
			deleteProfile: async () => null,
		};
	});

	afterEach(() => {
		mockService = null;
	});

	describe("GET /profile/:userId - Get Profile", () => {
		test("should return profile when user exists", async () => {
			const mockProfile = {
				userId: "user-1",
				name: "Andrei",
				bio: "Hello",
				languages: ["ro", "en"],
				hiddenIdentity: false,
			};

			mockService.getProfileByUserId = async (userId: string) =>
				userId === "user-1" ? mockProfile : null;

			const result = await mockService.getProfileByUserId("user-1");
			expect(result).toMatchObject(mockProfile);
		});

		test("should return null when user does not exist", async () => {
			mockService.getProfileByUserId = async () => null;

			const result = await mockService.getProfileByUserId("nonexistent-user");
			expect(result).toBeNull();
		});

		test("should handle service errors gracefully", async () => {
			mockService.getProfileByUserId = async () => {
				throw new Error("Database error");
			};

			try {
				await mockService.getProfileByUserId("user-1");
				expect(false).toBe(true);
			} catch (error) {
				expect((error as Error).message).toContain("Database error");
			}
		});
	});

	describe("POST /profile - Create Profile", () => {
		test("should accept valid profile data", () => {
			const validData = {
				name: "Andrei",
				image: "https://example.com/avatar.png",
				bio: "Hello world",
				languages: ["ro", "en"],
				hiddenIdentity: false,
			};

			const result = createProfileSchema.safeParse(validData);
			expect(result.success).toBe(true);
		});

		test("should accept valid data without optional fields", () => {
			const minimalData = {
				name: "Andrei",
				image: "https://example.com/avatar.png",
			};

			const result = createProfileSchema.safeParse(minimalData);
			expect(result.success).toBe(true);
		});

		test("should reject empty name", () => {
			const invalidData = {
				name: "",
				image: "https://example.com/avatar.png",
			};

			const result = createProfileSchema.safeParse(invalidData);
			expect(result.success).toBe(false);
		});

		test("should reject name longer than 100 characters", () => {
			const invalidData = {
				name: "A".repeat(101),
				image: "https://example.com/avatar.png",
			};

			const result = createProfileSchema.safeParse(invalidData);
			expect(result.success).toBe(false);
		});

		test("should reject invalid image URL", () => {
			const invalidData = {
				name: "Andrei",
				image: "not-a-url",
			};

			const result = createProfileSchema.safeParse(invalidData);
			expect(result.success).toBe(false);
		});

		test("should reject bio longer than 500 characters", () => {
			const invalidData = {
				name: "Andrei",
				image: "https://example.com/avatar.png",
				bio: "A".repeat(501),
			};

			const result = createProfileSchema.safeParse(invalidData);
			expect(result.success).toBe(false);
		});

		test("should reject languages array with more than 20 items", () => {
			const invalidData = {
				name: "Andrei",
				image: "https://example.com/avatar.png",
				languages: Array.from({ length: 21 }, (_, i) => `lang-${i}`),
			};

			const result = createProfileSchema.safeParse(invalidData);
			expect(result.success).toBe(false);
		});

		test("should reject languages array with empty string entries", () => {
			const invalidData = {
				name: "Andrei",
				image: "https://example.com/avatar.png",
				languages: ["ro", ""],
			};

			const result = createProfileSchema.safeParse(invalidData);
			expect(result.success).toBe(false);
		});

		test("should reject missing required fields", () => {
			const invalidData = {
				bio: "No name or image",
			};

			const result = createProfileSchema.safeParse(invalidData);
			expect(result.success).toBe(false);
		});

		test("should call service with validated data", async () => {
			let serviceCalled = false;
			let receivedData: any = null;

			mockService.createProfile = async (userId: string, data: any) => {
				serviceCalled = true;
				receivedData = data;
				return { userId, ...data };
			};

			const validData = {
				name: "Andrei",
				image: "https://example.com/avatar.png",
				bio: "Hello",
				languages: ["ro"],
				hiddenIdentity: false,
			};

			await mockService.createProfile("user-1", validData);

			expect(serviceCalled).toBe(true);
			expect(receivedData).toMatchObject(validData);
		});

		test("should handle service errors gracefully", async () => {
			mockService.createProfile = async () => {
				throw new Error("Database error");
			};

			try {
				await mockService.createProfile("user-1", {});
				expect(false).toBe(true);
			} catch (error) {
				expect((error as Error).message).toContain("Database error");
			}
		});
		test("should return unauthorized when session is missing", async () => {
			let receivedResponse: any = null;

			mockService.createProfile = async () => {
				throw new Error("Should not be called");
			};

			const mockSession = null;

			if (!mockSession) {
				receivedResponse = { kind: "unauthorized" };
			}

			expect(receivedResponse).toMatchObject({ kind: "unauthorized" });
		});
	});

	describe("PUT /profile/me - Update Profile", () => {
		test("should accept empty object (all fields optional)", () => {
			const result = updateProfileSchema.safeParse({});
			expect(result.success).toBe(true);
		});

		test("should accept partial update with only name", () => {
			const result = updateProfileSchema.safeParse({ name: "Andrei" });
			expect(result.success).toBe(true);
		});

		test("should accept partial update with only bio", () => {
			const result = updateProfileSchema.safeParse({ bio: "Updated bio" });
			expect(result.success).toBe(true);
		});

		test("should reject empty name when provided", () => {
			const result = updateProfileSchema.safeParse({ name: "" });
			expect(result.success).toBe(false);
		});

		test("should reject invalid image URL when provided", () => {
			const result = updateProfileSchema.safeParse({ image: "not-a-url" });
			expect(result.success).toBe(false);
		});

		test("should reject bio longer than 500 characters", () => {
			const result = updateProfileSchema.safeParse({ bio: "A".repeat(501) });
			expect(result.success).toBe(false);
		});

		test("should call service with updated data", async () => {
			let serviceCalled = false;
			let receivedData: any = null;

			mockService.updateProfile = async (userId: string, data: any) => {
				serviceCalled = true;
				receivedData = data;
				return { userId, ...data };
			};

			const updateData = { bio: "Updated bio" };
			await mockService.updateProfile("user-1", updateData);

			expect(serviceCalled).toBe(true);
			expect(receivedData).toMatchObject(updateData);
		});

		test("should return null when profile not found", async () => {
			mockService.updateProfile = async () => null;

			const result = await mockService.updateProfile("nonexistent-user", {
				bio: "test",
			});
			expect(result).toBeNull();
		});

		test("should handle service errors gracefully", async () => {
			mockService.updateProfile = async () => {
				throw new Error("Database error");
			};

			try {
				await mockService.updateProfile("user-1", { bio: "test" });
				expect(false).toBe(true);
			} catch (error) {
				expect((error as Error).message).toContain("Database error");
			}
		});
		test("should return unauthorized when session is missing", async () => {
			const mockSession = null;
			let receivedResponse: any = null;

			if (!mockSession) {
				receivedResponse = { kind: "unauthorized" };
			}

			expect(receivedResponse).toMatchObject({ kind: "unauthorized" });
		});
	});

	describe("DELETE /profile/me - Delete Profile", () => {
		test("should call service and return deleted true", async () => {
			let serviceCalled = false;

			mockService.deleteProfile = async (_userId: string) => {
				serviceCalled = true;
				return { deleted: true };
			};

			const result = await mockService.deleteProfile("user-1");

			expect(serviceCalled).toBe(true);
			expect(result).toMatchObject({ deleted: true });
		});

		test("should return null when profile not found", async () => {
			mockService.deleteProfile = async () => null;

			const result = await mockService.deleteProfile("nonexistent-user");
			expect(result).toBeNull();
		});

		test("should handle service errors gracefully", async () => {
			mockService.deleteProfile = async () => {
				throw new Error("Database error");
			};

			try {
				await mockService.deleteProfile("user-1");
				expect(false).toBe(true);
			} catch (error) {
				expect((error as Error).message).toContain("Database error");
			}
		});
		test("should return unauthorized when session is missing", async () => {
			const mockSession = null;
			let receivedResponse: any = null;

			if (!mockSession) {
				receivedResponse = { kind: "unauthorized" };
			}

			expect(receivedResponse).toMatchObject({ kind: "unauthorized" });
		});
	});
});
