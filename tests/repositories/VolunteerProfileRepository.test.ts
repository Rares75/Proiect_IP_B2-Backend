import { afterEach, describe, expect, test } from "bun:test";
import { db } from "../../src/db";
import { volunteerProfiles } from "../../src/db/profile";
import { VolunteerProfileRepository } from "../../src/db/repositories/volunteerProfile.repository";
import { container } from "../../src/di/container";

describe("VolunteerProfileRepository tests", () => {
	const repo = container.get(VolunteerProfileRepository);
	const originalSelect = (db as any).select;
	const originalInsert = (db as any).insert;
	const originalDelete = (db as any).delete;
	const originalUpdate = (db as any).update;

	afterEach(() => {
		(db as any).select = originalSelect;
		(db as any).insert = originalInsert;
		(db as any).delete = originalDelete;
		(db as any).update = originalUpdate;
	});

	test("should create a volunteer profile", async () => {
		const input = {
			volunteerId: 1,
			skills: ["first-aid"],
			maxDistanceKm: 20,
		};
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

		const result = await repo.create(input as any);

		expect(result).toMatchObject(expected);
		expect(insertedTable).toBe(volunteerProfiles);
		expect(insertedValues).toEqual(input);
	});

	test("should find volunteer profile by id", async () => {
		const expected = { id: 1, volunteerId: 1, skills: ["first-aid"] };
		let fromTable: unknown;

		(db as any).select = () => ({
			from: (table: unknown) => {
				fromTable = table;
				return {
					where: async () => [expected],
				};
			},
		});

		const result = await repo.findById(1);

		expect(result).toMatchObject(expected);
		expect(fromTable).toBe(volunteerProfiles);
	});

	test("should return undefined when profile not found by id", async () => {
		(db as any).select = () => ({
			from: () => ({
				where: async () => [],
			}),
		});

		const result = await repo.findById(999);

		expect(result).toBeUndefined();
	});

	test("should find volunteer profile by volunteerId", async () => {
		const expected = { id: 1, volunteerId: 42, skills: ["cooking"] };

		(db as any).select = () => ({
			from: () => ({
				where: async () => [expected],
			}),
		});

		const result = await repo.findByVolunteerId(42);

		expect(result).toMatchObject(expected);
	});

	test("should return undefined when profile not found by volunteerId", async () => {
		(db as any).select = () => ({
			from: () => ({
				where: async () => [],
			}),
		});

		const result = await repo.findByVolunteerId(999);

		expect(result).toBeUndefined();
	});

	test("should update a volunteer profile", async () => {
		const updated = { id: 1, volunteerId: 1, skills: ["first-aid", "driving"] };

		(db as any).update = () => ({
			set: () => ({
				where: () => ({
					returning: async () => [updated],
				}),
			}),
		});

		const result = await repo.update(1, { skills: ["first-aid", "driving"] });

		expect(result).toMatchObject(updated);
	});

	test("should delete a volunteer profile", async () => {
		let deletedTable: unknown;

		(db as any).delete = (table: unknown) => {
			deletedTable = table;
			return {
				where: () => ({
					returning: async () => [{ id: 1 }],
				}),
			};
		};

		const result = await repo.delete(1);

		expect(result).toBe(true);
		expect(deletedTable).toBe(volunteerProfiles);
	});

	test("should return false when deleting non-existent profile", async () => {
		(db as any).delete = () => ({
			where: () => ({
				returning: async () => [],
			}),
		});

		const result = await repo.delete(999);

		expect(result).toBe(false);
	});

	test("should check if profile exists", async () => {
		(db as any).select = () => ({
			from: () => ({
				where: async () => [{ value: 1 }],
			}),
		});

		const result = await repo.exists(1);

		expect(result).toBe(true);
	});

	test("should return false when profile does not exist", async () => {
		(db as any).select = () => ({
			from: () => ({
				where: async () => [{ value: 0 }],
			}),
		});

		const result = await repo.exists(999);

		expect(result).toBe(false);
	});

	test("should count volunteer profiles", async () => {
		(db as any).select = () => ({
			from: async () => [{ value: 5 }],
		});

		const result = await repo.count();

		expect(result).toBe(5);
	});

	test("should find many volunteer profiles", async () => {
		const expected = [
			{ id: 1, volunteerId: 1, skills: ["first-aid"] },
			{ id: 2, volunteerId: 2, skills: ["driving"] },
		];

		(db as any).select = () => ({
			from: () => ({
				limit: () => ({
					offset: async () => expected,
				}),
			}),
		});

		const result = await repo.findMany(50, 0);

		expect(result).toMatchObject(expected);
	});
	test("should find first volunteer profile by criteria", async () => {
		const expected = { id: 1, volunteerId: 1, skills: ["first-aid"] };

		(db as any).select = () => ({
			from: () => ({
				where: () => ({
					limit: async () => [expected],
				}),
			}),
		});

		const result = await repo.findFirstBy({ volunteerId: 1 });

		expect(result).toMatchObject(expected);
	});

	test("should return undefined when no profile matches criteria", async () => {
		(db as any).select = () => ({
			from: () => ({
				where: () => ({
					limit: async () => [],
				}),
			}),
		});

		const result = await repo.findFirstBy({ volunteerId: 999 });

		expect(result).toBeUndefined();
	});

	test("should return undefined when criteria is empty", async () => {
		const result = await repo.findFirstBy({});

		expect(result).toBeUndefined();
	});
});
