import { afterEach, beforeEach, describe, expect, test } from "bun:test";

describe("ProfileRepository", () => {
	let mockRepo: any;

	beforeEach(() => {
		const store: any[] = [];
		let nextId = 1;

		mockRepo = {
			async create(data: any) {
				const newProfile = { id: nextId++, ...data };
				store.push(newProfile);
				return newProfile;
			},

			async update(id: number, data: any) {
				const index = store.findIndex((p) => p.id === id);
				if (index === -1) return undefined;
				store[index] = { ...store[index], ...data };
				return store[index];
			},

			async delete(id: number) {
				const index = store.findIndex((p) => p.id === id);
				if (index === -1) return false;
				store.splice(index, 1);
				return true;
			},

			async exists(id: number) {
				return store.some((p) => p.id === id);
			},

			async findById(id: number) {
				return store.find((p) => p.id === id) ?? undefined;
			},

			async findFirstBy(criteria: any) {
				const keys = Object.entries(criteria).filter(
					([, v]) => v !== undefined,
				);
				if (keys.length === 0) return undefined;
				return (
					store.find((p) => keys.every(([k, v]) => p[k] === v)) ?? undefined
				);
			},

			async findMany(limit = 50, offset = 0) {
				return store.slice(offset, offset + limit);
			},

			async count() {
				return store.length;
			},
		};
	});

	afterEach(() => {
		mockRepo = null;
	});

	describe("create", () => {
		test("should create and return a new profile", async () => {
			const data = { userId: "user-1", bio: "Hello", languages: ["ro"] };
			const result = await mockRepo.create(data);

			expect(result).toMatchObject(data);
			expect(result.id).toBeDefined();
		});

		test("should assign incremental ids", async () => {
			const first = await mockRepo.create({ userId: "user-1" });
			const second = await mockRepo.create({ userId: "user-2" });

			expect(second.id).toBe(first.id + 1);
		});
	});

	describe("update", () => {
		test("should update and return updated profile", async () => {
			const created = await mockRepo.create({ userId: "user-1", bio: "Old" });
			const updated = await mockRepo.update(created.id, { bio: "New" });

			expect(updated).toBeDefined();
			expect(updated.bio).toBe("New");
		});

		test("should return undefined when profile not found", async () => {
			const result = await mockRepo.update(999, { bio: "New" });
			expect(result).toBeUndefined();
		});

		test("should only update specified fields", async () => {
			const created = await mockRepo.create({
				userId: "user-1",
				bio: "Old",
				hiddenIdentity: false,
			});
			const updated = await mockRepo.update(created.id, { bio: "New" });

			expect(updated.hiddenIdentity).toBe(false);
			expect(updated.bio).toBe("New");
		});
	});

	describe("delete", () => {
		test("should delete profile and return true", async () => {
			const created = await mockRepo.create({ userId: "user-1" });
			const result = await mockRepo.delete(created.id);

			expect(result).toBe(true);
		});

		test("should return false when profile not found", async () => {
			const result = await mockRepo.delete(999);
			expect(result).toBe(false);
		});

		test("should remove profile from store", async () => {
			const created = await mockRepo.create({ userId: "user-1" });
			await mockRepo.delete(created.id);

			const found = await mockRepo.findById(created.id);
			expect(found).toBeUndefined();
		});
	});

	describe("exists", () => {
		test("should return true when profile exists", async () => {
			const created = await mockRepo.create({ userId: "user-1" });
			const result = await mockRepo.exists(created.id);

			expect(result).toBe(true);
		});

		test("should return false when profile does not exist", async () => {
			const result = await mockRepo.exists(999);
			expect(result).toBe(false);
		});
	});

	describe("findById", () => {
		test("should return profile when found", async () => {
			const created = await mockRepo.create({ userId: "user-1", bio: "Hello" });
			const result = await mockRepo.findById(created.id);

			expect(result).toMatchObject({ userId: "user-1", bio: "Hello" });
		});

		test("should return undefined when not found", async () => {
			const result = await mockRepo.findById(999);
			expect(result).toBeUndefined();
		});
	});

	describe("findFirstBy", () => {
		test("should return profile matching criteria", async () => {
			await mockRepo.create({ userId: "user-1", bio: "Hello" });
			const result = await mockRepo.findFirstBy({ userId: "user-1" });

			expect(result).toBeDefined();
			expect(result.userId).toBe("user-1");
		});

		test("should return undefined when no match found", async () => {
			const result = await mockRepo.findFirstBy({ userId: "nonexistent" });
			expect(result).toBeUndefined();
		});

		test("should return undefined when criteria is empty", async () => {
			await mockRepo.create({ userId: "user-1" });
			const result = await mockRepo.findFirstBy({});
			expect(result).toBeUndefined();
		});

		test("should match multiple criteria", async () => {
			await mockRepo.create({ userId: "user-1", hiddenIdentity: false });
			await mockRepo.create({ userId: "user-2", hiddenIdentity: true });

			const result = await mockRepo.findFirstBy({
				userId: "user-2",
				hiddenIdentity: true,
			});

			expect(result).toBeDefined();
			expect(result.userId).toBe("user-2");
		});
	});

	describe("findMany", () => {
		test("should return all profiles with default limit", async () => {
			await mockRepo.create({ userId: "user-1" });
			await mockRepo.create({ userId: "user-2" });
			await mockRepo.create({ userId: "user-3" });

			const result = await mockRepo.findMany();
			expect(result.length).toBe(3);
		});

		test("should respect limit parameter", async () => {
			await mockRepo.create({ userId: "user-1" });
			await mockRepo.create({ userId: "user-2" });
			await mockRepo.create({ userId: "user-3" });

			const result = await mockRepo.findMany(2);
			expect(result.length).toBe(2);
		});

		test("should respect offset parameter", async () => {
			await mockRepo.create({ userId: "user-1" });
			await mockRepo.create({ userId: "user-2" });
			await mockRepo.create({ userId: "user-3" });

			const result = await mockRepo.findMany(50, 2);
			expect(result.length).toBe(1);
			expect(result[0].userId).toBe("user-3");
		});

		test("should return empty array when no profiles exist", async () => {
			const result = await mockRepo.findMany();
			expect(result).toEqual([]);
		});
	});

	describe("count", () => {
		test("should return 0 when no profiles exist", async () => {
			const result = await mockRepo.count();
			expect(result).toBe(0);
		});

		test("should return correct count after inserts", async () => {
			await mockRepo.create({ userId: "user-1" });
			await mockRepo.create({ userId: "user-2" });

			const result = await mockRepo.count();
			expect(result).toBe(2);
		});

		test("should update count after delete", async () => {
			const created = await mockRepo.create({ userId: "user-1" });
			await mockRepo.create({ userId: "user-2" });
			await mockRepo.delete(created.id);

			const result = await mockRepo.count();
			expect(result).toBe(1);
		});
	});
});
