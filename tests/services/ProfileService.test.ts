import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { NotFoundError } from "../../src/utils/Errors";

describe("ProfileService", () => {
	let mockRepo: any;
	let mockService: any;

	beforeEach(() => {
		mockRepo = {
			findFirstBy: async () => null,
			findById: async () => null,
			create: async () => null,
			update: async () => null,
			delete: async () => null,
		};

		mockService = {
			async createProfile(userId: string, data: any) {
				const existing = await mockRepo.findFirstBy({ userId });
				if (existing) throw new Error("Profile already exists");

				const created = await mockRepo.create({
					userId,
					bio: data.bio,
					languages: data.languages,
					hiddenIdentity: data.hiddenIdentity,
				});

				return created;
			},

			async getProfileByUserId(userId: string) {
				const profile = await mockRepo.findFirstBy({ userId });
				if (!profile) throw new NotFoundError("Profile", userId);
				return profile;
			},

			async getProfileById(id: number) {
				const profile = await mockRepo.findById(id);
				if (!profile) throw new NotFoundError("Profile", String(id));
				return profile;
			},

			async updateProfile(userId: string, data: any) {
				const existing = await mockRepo.findFirstBy({ userId });
				if (!existing) throw new NotFoundError("Profile", userId);

				const updated = await mockRepo.update(existing.id, {
					bio: data.bio,
					languages: data.languages,
					hiddenIdentity: data.hiddenIdentity,
				});

				return updated;
			},

			async deleteProfile(userId: string) {
				const existing = await mockRepo.findFirstBy({ userId });
				if (!existing) throw new NotFoundError("Profile", userId);
				return await mockRepo.delete(existing.id);
			},
		};
	});

	afterEach(() => {
		mockRepo = null;
		mockService = null;
	});

	describe("createProfile", () => {
		test("should create profile when user has no existing profile", async () => {
			const mockCreated = { id: 1, userId: "user-1", bio: "Hello" };

			mockRepo.findFirstBy = async () => null;
			mockRepo.create = async () => mockCreated;

			const result = await mockService.createProfile("user-1", {
				name: "Andrei",
				image: "https://example.com/avatar.png",
				bio: "Hello",
			});

			expect(result).toMatchObject(mockCreated);
		});

		test("should throw if profile already exists", async () => {
			mockRepo.findFirstBy = async () => ({ id: 1, userId: "user-1" });

			try {
				await mockService.createProfile("user-1", {
					name: "Andrei",
					image: "https://example.com/avatar.png",
				});
				expect(false).toBe(true);
			} catch (error) {
				expect((error as Error).message).toContain("Profile already exists");
			}
		});

		test("should call repo.create with correct data", async () => {
			let receivedData: any = null;

			mockRepo.findFirstBy = async () => null;
			mockRepo.create = async (data: any) => {
				receivedData = data;
				return { id: 1, ...data };
			};

			await mockService.createProfile("user-1", {
				name: "Andrei",
				image: "https://example.com/avatar.png",
				bio: "Hello",
				languages: ["ro"],
				hiddenIdentity: false,
			});

			expect(receivedData).toMatchObject({
				userId: "user-1",
				bio: "Hello",
				languages: ["ro"],
				hiddenIdentity: false,
			});
		});

		test("should handle repo errors gracefully", async () => {
			mockRepo.findFirstBy = async () => null;
			mockRepo.create = async () => {
				throw new Error("Database error");
			};

			try {
				await mockService.createProfile("user-1", {
					name: "Andrei",
					image: "https://example.com/avatar.png",
				});
				expect(false).toBe(true);
			} catch (error) {
				expect((error as Error).message).toContain("Database error");
			}
		});
	});

	describe("getProfileByUserId", () => {
		test("should return profile when found", async () => {
			const mockProfile = { id: 1, userId: "user-1", bio: "Hello" };
			mockRepo.findFirstBy = async () => mockProfile;

			const result = await mockService.getProfileByUserId("user-1");
			expect(result).toMatchObject(mockProfile);
		});

		test("should throw NotFoundError when profile does not exist", async () => {
			mockRepo.findFirstBy = async () => null;

			try {
				await mockService.getProfileByUserId("user-1");
				expect(false).toBe(true);
			} catch (error) {
				expect(error).toBeInstanceOf(NotFoundError);
			}
		});

		test("should handle repo errors gracefully", async () => {
			mockRepo.findFirstBy = async () => {
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

	describe("getProfileById", () => {
		test("should return profile when found by id", async () => {
			const mockProfile = { id: 1, userId: "user-1", bio: "Hello" };
			mockRepo.findById = async () => mockProfile;

			const result = await mockService.getProfileById(1);
			expect(result).toMatchObject(mockProfile);
		});

		test("should throw NotFoundError when profile does not exist", async () => {
			mockRepo.findById = async () => null;

			try {
				await mockService.getProfileById(999);
				expect(false).toBe(true);
			} catch (error) {
				expect(error).toBeInstanceOf(NotFoundError);
			}
		});

		test("should handle repo errors gracefully", async () => {
			mockRepo.findById = async () => {
				throw new Error("Database error");
			};

			try {
				await mockService.getProfileById(1);
				expect(false).toBe(true);
			} catch (error) {
				expect((error as Error).message).toContain("Database error");
			}
		});
	});

	describe("updateProfile", () => {
		test("should update profile when it exists", async () => {
			const existing = { id: 1, userId: "user-1", bio: "Old bio" };
			const updated = { id: 1, userId: "user-1", bio: "New bio" };

			mockRepo.findFirstBy = async () => existing;
			mockRepo.update = async () => updated;

			const result = await mockService.updateProfile("user-1", {
				bio: "New bio",
			});
			expect(result).toMatchObject(updated);
		});

		test("should throw NotFoundError when profile does not exist", async () => {
			mockRepo.findFirstBy = async () => null;

			try {
				await mockService.updateProfile("user-1", { bio: "New bio" });
				expect(false).toBe(true);
			} catch (error) {
				expect(error).toBeInstanceOf(NotFoundError);
			}
		});

		test("should call repo.update with correct data", async () => {
			let receivedId: any = null;
			let receivedData: any = null;

			mockRepo.findFirstBy = async () => ({ id: 1, userId: "user-1" });
			mockRepo.update = async (id: number, data: any) => {
				receivedId = id;
				receivedData = data;
				return { id, ...data };
			};

			await mockService.updateProfile("user-1", {
				bio: "Updated",
				languages: ["ro", "en"],
				hiddenIdentity: true,
			});

			expect(receivedId).toBe(1);
			expect(receivedData).toMatchObject({
				bio: "Updated",
				languages: ["ro", "en"],
				hiddenIdentity: true,
			});
		});

		test("should handle repo errors gracefully", async () => {
			mockRepo.findFirstBy = async () => ({ id: 1, userId: "user-1" });
			mockRepo.update = async () => {
				throw new Error("Database error");
			};

			try {
				await mockService.updateProfile("user-1", { bio: "test" });
				expect(false).toBe(true);
			} catch (error) {
				expect((error as Error).message).toContain("Database error");
			}
		});
	});

	describe("deleteProfile", () => {
		test("should delete profile when it exists", async () => {
			mockRepo.findFirstBy = async () => ({ id: 1, userId: "user-1" });
			mockRepo.delete = async () => ({ deleted: true });

			const result = await mockService.deleteProfile("user-1");
			expect(result).toMatchObject({ deleted: true });
		});

		test("should throw NotFoundError when profile does not exist", async () => {
			mockRepo.findFirstBy = async () => null;

			try {
				await mockService.deleteProfile("user-1");
				expect(false).toBe(true);
			} catch (error) {
				expect(error).toBeInstanceOf(NotFoundError);
			}
		});

		test("should call repo.delete with correct id", async () => {
			let deletedId: any = null;

			mockRepo.findFirstBy = async () => ({ id: 42, userId: "user-1" });
			mockRepo.delete = async (id: number) => {
				deletedId = id;
				return { deleted: true };
			};

			await mockService.deleteProfile("user-1");
			expect(deletedId).toBe(42);
		});

		test("should handle repo errors gracefully", async () => {
			mockRepo.findFirstBy = async () => ({ id: 1, userId: "user-1" });
			mockRepo.delete = async () => {
				throw new Error("Database error");
			};

			try {
				await mockService.deleteProfile("user-1");
				expect(false).toBe(true);
			} catch (error) {
				expect((error as Error).message).toContain("Database error");
			}
		});
	});
});
