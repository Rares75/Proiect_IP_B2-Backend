import { afterEach, describe, expect, test, mock } from "bun:test";

mock.module("../../src/db", () => ({
	db: {
		select: () => ({}),
		insert: () => ({}),
		update: () => ({}),
		delete: () => ({}),
	},
}));

import { ProfileRepository } from "../../src/db/repositories/profile.repository";
import { userProfiles } from "../../src/db/profile";

describe("ProfileRepository", () => {
	const repository = new ProfileRepository();

	let originalDb: any;

	afterEach(async () => {
		const { db } = await import("../../src/db");
		if (originalDb) {
			(db as any).select = originalDb.select;
			(db as any).insert = originalDb.insert;
			(db as any).update = originalDb.update;
			(db as any).delete = originalDb.delete;
		}
	});

	describe("create", () => {
		test("should insert into userProfiles and return created profile", async () => {
			const { db } = await import("../../src/db");
			const input = { userId: "user-1", bio: "Hello", languages: ["ro"] };
			const expected = { id: 1, ...input };
			let insertedTable: unknown;
			let insertedValues: unknown;

			(db as any).insert = (table: unknown) => {
				insertedTable = table;
				return {
					values: (values: unknown) => {
						insertedValues = values;
						return {
							returning: async () => [expected],
						};
					},
				};
			};

			const result = await repository.create(input as any);

			expect(result).toMatchObject(expected);
			expect(insertedTable).toBe(userProfiles);
			expect(insertedValues).toEqual(input);
		});
	});

	describe("update", () => {
		test("should update correct record and return updated profile", async () => {
			const { db } = await import("../../src/db");
			const expected = { id: 1, userId: "user-1", bio: "New bio" };
			let updatedTable: unknown;

			(db as any).update = (table: unknown) => {
				updatedTable = table;
				return {
					set: () => ({
						where: () => ({
							returning: async () => [expected],
						}),
					}),
				};
			};

			const result = await repository.update(1, { bio: "New bio" });

			expect(result).toMatchObject(expected);
			expect(updatedTable).toBe(userProfiles);
		});

		test("should return undefined when record not found", async () => {
			const { db } = await import("../../src/db");

			(db as any).update = () => ({
				set: () => ({
					where: () => ({
						returning: async () => [],
					}),
				}),
			});

			const result = await repository.update(999, { bio: "New bio" });

			expect(result).toBeUndefined();
		});
	});

	describe("delete", () => {
		test("should delete correct record and return true", async () => {
			const { db } = await import("../../src/db");
			let deletedTable: unknown;

			(db as any).delete = (table: unknown) => {
				deletedTable = table;
				return {
					where: () => ({
						returning: async () => [{ id: 1 }],
					}),
				};
			};

			const result = await repository.delete(1);

			expect(result).toBe(true);
			expect(deletedTable).toBe(userProfiles);
		});

		test("should return false when record not found", async () => {
			const { db } = await import("../../src/db");

			(db as any).delete = () => ({
				where: () => ({
					returning: async () => [],
				}),
			});

			const result = await repository.delete(999);

			expect(result).toBe(false);
		});
	});

	describe("exists", () => {
		test("should return true when profile exists", async () => {
			const { db } = await import("../../src/db");

			(db as any).select = () => ({
				from: () => ({
					where: async () => [{ value: 1 }],
				}),
			});

			const result = await repository.exists(1);

			expect(result).toBe(true);
		});

		test("should return false when profile does not exist", async () => {
			const { db } = await import("../../src/db");

			(db as any).select = () => ({
				from: () => ({
					where: async () => [{ value: 0 }],
				}),
			});

			const result = await repository.exists(999);

			expect(result).toBe(false);
		});
	});

	describe("findById", () => {
		test("should return profile when found", async () => {
			const { db } = await import("../../src/db");
			const expected = { id: 1, userId: "user-1", bio: "Hello" };
			let fromTable: unknown;

			(db as any).select = () => ({
				from: (table: unknown) => {
					fromTable = table;
					return {
						where: async () => [expected],
					};
				},
			});

			const result = await repository.findById(1);

			expect(result).toMatchObject(expected);
			expect(fromTable).toBe(userProfiles);
		});

		test("should return undefined when not found", async () => {
			const { db } = await import("../../src/db");

			(db as any).select = () => ({
				from: () => ({
					where: async () => [],
				}),
			});

			const result = await repository.findById(999);

			expect(result).toBeUndefined();
		});
	});

	describe("findFirstBy", () => {
		test("should return profile matching criteria", async () => {
			const { db } = await import("../../src/db");
			const expected = { id: 1, userId: "user-1", bio: "Hello" };
			let fromTable: unknown;

			(db as any).select = () => ({
				from: (table: unknown) => {
					fromTable = table;
					return {
						where: () => ({
							limit: async () => [expected],
						}),
					};
				},
			});

			const result = await repository.findFirstBy({ userId: "user-1" });

			expect(result).toMatchObject(expected);
			expect(fromTable).toBe(userProfiles);
		});

		test("should return undefined when no match found", async () => {
			const { db } = await import("../../src/db");

			(db as any).select = () => ({
				from: () => ({
					where: () => ({
						limit: async () => [],
					}),
				}),
			});

			const result = await repository.findFirstBy({ userId: "nonexistent" });

			expect(result).toBeUndefined();
		});

		test("should return undefined when criteria is empty", async () => {
			// Nu ajunge la db deloc — returneaza undefined inainte
			const result = await repository.findFirstBy({});

			expect(result).toBeUndefined();
		});
	});

	describe("findMany", () => {
		test("should query from userProfiles and return profiles", async () => {
			const { db } = await import("../../src/db");
			const expected = [{ id: 1 }, { id: 2 }];
			let fromTable: unknown;

			(db as any).select = () => ({
				from: (table: unknown) => {
					fromTable = table;
					return {
						limit: () => ({
							offset: async () => expected,
						}),
					};
				},
			});

			const result = await repository.findMany();

			expect(result).toMatchObject(expected);
			expect(fromTable).toBe(userProfiles);
		});
	});

	describe("count", () => {
		test("should return count from userProfiles", async () => {
			const { db } = await import("../../src/db");
			let fromTable: unknown;

			(db as any).select = () => ({
				from: (table: unknown) => {
					fromTable = table;
					return Promise.resolve([{ value: 5 }]);
				},
			});

			const result = await repository.count();

			expect(result).toBe(5);
			expect(fromTable).toBe(userProfiles);
		});
	});
});
