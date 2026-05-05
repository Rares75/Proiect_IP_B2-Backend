import { beforeEach, afterEach, describe, expect, test } from "bun:test";
import { db } from "../../src/db";
import { NotFoundError } from "../../src/utils/Errors";

import { ProfileService } from "../../src/services/ProfileService";

describe("ProfileService", () => {
	let service: ProfileService;
	let mockRepo: any;
	const originalUpdate = (db as any).update;

	beforeEach(() => {
		(db as any).update = () => ({
			set: () => ({
				where: async () => [],
			}),
		});

		mockRepo = {
			findFirstBy: async () => null,
			findById: async () => null,
			create: async () => null,
			update: async () => null,
			delete: async () => null,
		};

		service = new ProfileService(mockRepo as any);
	});

	afterEach(() => {
		(db as any).update = originalUpdate;
		mockRepo = null;
	});

	describe("createProfile", () => {
		test("should create profile when user has no existing profile", async () => {
			const mockCreated = { id: 1, userId: "user-1", bio: "Hello" };
			mockRepo.findFirstBy = async () => null;
			mockRepo.create = async () => mockCreated;

			const result = await service.createProfile("user-1", {
				name: "Andrei",
				image: "https://example.com/avatar.png",
				bio: "Hello",
			});

			expect(result).toMatchObject(mockCreated);
		});

		test("should throw if profile already exists", async () => {
			mockRepo.findFirstBy = async () => ({ id: 1, userId: "user-1" });

			expect(
				service.createProfile("user-1", {
					name: "Andrei",
					image: "https://example.com/avatar.png",
				}),
			).rejects.toThrow("Profile already exists");
		});

		test("should call repo.create with correct fields (not name/image)", async () => {
			let receivedData: any = null;
			mockRepo.findFirstBy = async () => null;
			mockRepo.create = async (data: any) => {
				receivedData = data;
				return { id: 1, ...data };
			};

			await service.createProfile("user-1", {
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
			expect(receivedData.name).toBeUndefined();
			expect(receivedData.image).toBeUndefined();
		});

		test("should propagate repo errors", async () => {
			mockRepo.findFirstBy = async () => null;
			mockRepo.create = async () => {
				throw new Error("Database error");
			};

			expect(
				service.createProfile("user-1", {
					name: "Andrei",
					image: "https://example.com/avatar.png",
				}),
			).rejects.toThrow("Database error");
		});
	});

	describe("getProfileByUserId", () => {
		test("should return profile when found", async () => {
			const mockProfile = { id: 1, userId: "user-1", bio: "Hello" };
			mockRepo.findFirstBy = async () => mockProfile;

			const result = await service.getProfileByUserId("user-1");

			expect(result).toMatchObject(mockProfile);
		});

		test("should throw NotFoundError when profile does not exist", async () => {
			mockRepo.findFirstBy = async () => null;

			expect(service.getProfileByUserId("user-1")).rejects.toBeInstanceOf(
				NotFoundError,
			);
		});

		test("should propagate repo errors", async () => {
			mockRepo.findFirstBy = async () => {
				throw new Error("Database error");
			};

			expect(service.getProfileByUserId("user-1")).rejects.toThrow(
				"Database error",
			);
		});
	});

	describe("getProfileById", () => {
		test("should return profile when found", async () => {
			const mockProfile = { id: 1, userId: "user-1", bio: "Hello" };
			mockRepo.findById = async () => mockProfile;

			const result = await service.getProfileById(1);

			expect(result).toMatchObject(mockProfile);
		});

		test("should throw NotFoundError when profile does not exist", async () => {
			mockRepo.findById = async () => null;

			expect(service.getProfileById(999)).rejects.toBeInstanceOf(NotFoundError);
		});

		test("should propagate repo errors", async () => {
			mockRepo.findById = async () => {
				throw new Error("Database error");
			};

			expect(service.getProfileById(1)).rejects.toThrow("Database error");
		});
	});

	describe("updateProfile", () => {
		test("should update and return profile when it exists", async () => {
			const existing = { id: 1, userId: "user-1", bio: "Old bio" };
			const updated = { id: 1, userId: "user-1", bio: "New bio" };
			mockRepo.findFirstBy = async () => existing;
			mockRepo.update = async () => updated;

			const result = await service.updateProfile("user-1", { bio: "New bio" });

			expect(result).toMatchObject(updated);
		});

		test("should throw NotFoundError when profile does not exist", async () => {
			mockRepo.findFirstBy = async () => null;

			expect(
				service.updateProfile("user-1", { bio: "New bio" }),
			).rejects.toBeInstanceOf(NotFoundError);
		});

		test("should call repo.update with correct id and fields", async () => {
			let receivedId: any = null;
			let receivedData: any = null;
			mockRepo.findFirstBy = async () => ({ id: 42, userId: "user-1" });
			mockRepo.update = async (id: number, data: any) => {
				receivedId = id;
				receivedData = data;
				return { id, ...data };
			};

			await service.updateProfile("user-1", {
				bio: "Updated",
				languages: ["ro", "en"],
				hiddenIdentity: true,
			});

			expect(receivedId).toBe(42);
			expect(receivedData).toMatchObject({
				bio: "Updated",
				languages: ["ro", "en"],
				hiddenIdentity: true,
			});
		});

		test("should propagate repo errors", async () => {
			mockRepo.findFirstBy = async () => ({ id: 1, userId: "user-1" });
			mockRepo.update = async () => {
				throw new Error("Database error");
			};

			expect(service.updateProfile("user-1", { bio: "test" })).rejects.toThrow(
				"Database error",
			);
		});
	});

	describe("deleteProfile", () => {
		test("should delete profile and return true when it exists", async () => {
			mockRepo.findFirstBy = async () => ({ id: 1, userId: "user-1" });
			mockRepo.delete = async () => true;

			const result = await service.deleteProfile("user-1");

			expect(result).toBe(true);
		});

		test("should throw NotFoundError when profile does not exist", async () => {
			mockRepo.findFirstBy = async () => null;

			expect(service.deleteProfile("user-1")).rejects.toBeInstanceOf(
				NotFoundError,
			);
		});

		test("should call repo.delete with correct id", async () => {
			let deletedId: any = null;
			mockRepo.findFirstBy = async () => ({ id: 42, userId: "user-1" });
			mockRepo.delete = async (id: number) => {
				deletedId = id;
				return true;
			};

			await service.deleteProfile("user-1");

			expect(deletedId).toBe(42);
		});

		test("should propagate repo errors", async () => {
			mockRepo.findFirstBy = async () => ({ id: 1, userId: "user-1" });
			mockRepo.delete = async () => {
				throw new Error("Database error");
			};

			expect(service.deleteProfile("user-1")).rejects.toThrow("Database error");
		});
	});
});
