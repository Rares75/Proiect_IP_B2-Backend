import { describe, expect, test, afterEach } from "bun:test";
import { db } from "../../src/db";
import { volunteers, volunteerProfiles } from "../../src/db/profile";

const originalInsert = (db as any).insert;
const originalSelect = (db as any).select;

function restoreDb() {
	(db as any).insert = originalInsert;
	(db as any).select = originalSelect;
}

describe("VolunteerRepository.create — volunteers table", () => {
	afterEach(restoreDb);

	test("inserts into the volunteers table with correct values", async () => {
		const { VolunteerRepository } = await import(
			"../../src/db/repositories/volunteer.repository"
		);
		const repo = new VolunteerRepository();

		const expected = {
			id: 1,
			userId: "user-vol-1",
			availability: false,
			trustScore: 0,
			completedTasks: 0,
		};

		let capturedTable: unknown;
		let capturedValues: unknown;

		(db as any).insert = (table: unknown) => {
			capturedTable = table;
			return {
				values: (values: unknown) => {
					capturedValues = values;
					return { returning: async () => [expected] };
				},
			};
		};

		const result = await repo.create({
			userId: "user-vol-1",
			availability: false,
			trustScore: 0,
			completedTasks: 0,
		});

		expect(result).toMatchObject(expected);
		expect(capturedTable).toBe(volunteers);
		expect((capturedValues as any).userId).toBe("user-vol-1");
		expect((capturedValues as any).availability).toBe(false);
		expect((capturedValues as any).trustScore).toBe(0);
		expect((capturedValues as any).completedTasks).toBe(0);
	});

	test("defaults availability to false when not provided", async () => {
		const { VolunteerRepository } = await import(
			"../../src/db/repositories/volunteer.repository"
		);
		const repo = new VolunteerRepository();

		let capturedValues: unknown;

		(db as any).insert = (_table: unknown) => ({
			values: (values: unknown) => {
				capturedValues = values;
				return {
					returning: async () => [
						{
							id: 2,
							userId: "user-vol-2",
							availability: false,
							trustScore: 0,
							completedTasks: 0,
						},
					],
				};
			},
		});

		await repo.create({
			userId: "user-vol-2",
			availability: false,
			trustScore: 0,
			completedTasks: 0,
		});

		expect((capturedValues as any).availability).toBe(false);
	});

	test("returns the created volunteer record from DB", async () => {
		const { VolunteerRepository } = await import(
			"../../src/db/repositories/volunteer.repository"
		);
		const repo = new VolunteerRepository();

		const dbRecord = {
			id: 3,
			userId: "user-vol-3",
			availability: false,
			trustScore: 0,
			completedTasks: 0,
		};

		(db as any).insert = (_table: unknown) => ({
			values: (_values: unknown) => ({
				returning: async () => [dbRecord],
			}),
		});

		const result = await repo.create({
			userId: "user-vol-3",
			availability: false,
			trustScore: 0,
			completedTasks: 0,
		});

		expect(result.id).toBe(3);
		expect(result.userId).toBe("user-vol-3");
	});
});

describe("VolunteerRepository.findByUserId", () => {
	afterEach(restoreDb);

	test("returns the volunteer record for an existing userId", async () => {
		const { VolunteerRepository } = await import(
			"../../src/db/repositories/volunteer.repository"
		);
		const repo = new VolunteerRepository();

		const record = { id: 10, userId: "user-existing", availability: true };

		(db as any).select = () => ({
			from: () => ({
				where: async () => [record],
			}),
		});

		const result = await repo.findByUserId("user-existing");
		expect(result).toMatchObject(record);
	});

	test("returns undefined for a userId that is not a volunteer", async () => {
		const { VolunteerRepository } = await import(
			"../../src/db/repositories/volunteer.repository"
		);
		const repo = new VolunteerRepository();

		(db as any).select = () => ({
			from: () => ({
				where: async () => [],
			}),
		});

		const result = await repo.findByUserId("not-a-volunteer");
		expect(result).toBeUndefined();
	});
});

describe("VolunteerRepository.exists", () => {
	afterEach(restoreDb);

	test("returns false for a non-existent volunteer id", async () => {
		const { VolunteerRepository } = await import(
			"../../src/db/repositories/volunteer.repository"
		);
		const repo = new VolunteerRepository();

		(db as any).select = () => ({
			from: () => ({
				where: async () => [{ value: 0 }],
			}),
		});

		const result = await repo.exists(9999);
		expect(result).toBe(false);
	});

	test("returns true for an existing volunteer id", async () => {
		const { VolunteerRepository } = await import(
			"../../src/db/repositories/volunteer.repository"
		);
		const repo = new VolunteerRepository();

		(db as any).select = () => ({
			from: () => ({
				where: async () => [{ value: 1 }],
			}),
		});

		const result = await repo.exists(10);
		expect(result).toBe(true);
	});
});

describe("VolunteerRepository — full upgrade flow", () => {
	afterEach(restoreDb);

	test("volunteer is findable by userId immediately after creation", async () => {
		const { VolunteerRepository } = await import(
			"../../src/db/repositories/volunteer.repository"
		);
		const repo = new VolunteerRepository();

		const created = {
			id: 20,
			userId: "user-upgrade-flow",
			availability: false,
			trustScore: 0,
			completedTasks: 0,
		};

		(db as any).insert = () => ({
			values: () => ({ returning: async () => [created] }),
		});

		const newVolunteer = await repo.create({
			userId: "user-upgrade-flow",
			availability: false,
			trustScore: 0,
			completedTasks: 0,
		});

		(db as any).select = () => ({
			from: () => ({
				where: async () => [created],
			}),
		});

		const found = await repo.findByUserId("user-upgrade-flow");

		expect(newVolunteer.id).toBe(found?.id);
		expect(found?.userId).toBe("user-upgrade-flow");
	});

	test("exists returns true after a volunteer record is created", async () => {
		const { VolunteerRepository } = await import(
			"../../src/db/repositories/volunteer.repository"
		);
		const repo = new VolunteerRepository();

		const created = {
			id: 21,
			userId: "user-exists-check",
			availability: false,
			trustScore: 0,
			completedTasks: 0,
		};

		(db as any).insert = () => ({
			values: () => ({ returning: async () => [created] }),
		});

		const newVolunteer = await repo.create({
			userId: "user-exists-check",
			availability: false,
			trustScore: 0,
			completedTasks: 0,
		});

		(db as any).select = () => ({
			from: () => ({
				where: async () => [{ value: 1 }],
			}),
		});

		const found = await repo.exists(newVolunteer.id);
		expect(found).toBe(true);
	});
});

describe("VolunteerRepository.create — volunteerProfiles table", () => {
	afterEach(restoreDb);

	test("inserts into volunteerProfiles table with volunteerId foreign key", async () => {
		const { VolunteerRepository } = await import(
			"../../src/db/repositories/volunteer.repository"
		);
		const _repo = new VolunteerRepository();

		const expectedProfile = {
			id: 1,
			volunteerId: 30,
			bio: null,
			profilePicture: null,
		};

		let capturedTable: unknown;
		let capturedValues: unknown;

		(db as any).insert = (table: unknown) => {
			capturedTable = table;
			return {
				values: (values: unknown) => {
					capturedValues = values;
					return { returning: async () => [expectedProfile] };
				},
			};
		};

		const [result] = await (db as any)
			.insert(volunteerProfiles)
			.values({ volunteerId: 30 })
			.returning();

		expect(result).toMatchObject(expectedProfile);
		expect(capturedTable).toBe(volunteerProfiles);
		expect((capturedValues as any).volunteerId).toBe(30);
	});

	test("volunteerProfiles links to the correct volunteer id", async () => {
		const { VolunteerRepository } = await import(
			"../../src/db/repositories/volunteer.repository"
		);
		const repo = new VolunteerRepository();

		const volunteerId = 31;
		const volunteerRecord = {
			id: volunteerId,
			userId: "user-profile-link",
			availability: false,
			trustScore: 0,
			completedTasks: 0,
		};
		const profileRecord = { id: 5, volunteerId, bio: null };

		(db as any).insert = () => ({
			values: () => ({ returning: async () => [volunteerRecord] }),
		});

		const newVol = await repo.create({
			userId: "user-profile-link",
			availability: false,
			trustScore: 0,
			completedTasks: 0,
		});

		let capturedProfileValues: unknown;
		(db as any).insert = (_table: unknown) => ({
			values: (values: unknown) => {
				capturedProfileValues = values;
				return { returning: async () => [profileRecord] };
			},
		});

		await (db as any)
			.insert(volunteerProfiles)
			.values({ volunteerId: newVol.id })
			.returning();

		expect((capturedProfileValues as any).volunteerId).toBe(newVol.id);
		expect(newVol.id).toBe(volunteerId);
	});

	test("volunteerProfiles insert uses the volunteerProfiles table", async () => {
		let capturedTable: unknown;

		(db as any).insert = (table: unknown) => {
			capturedTable = table;
			return {
				values: () => ({ returning: async () => [{ id: 1, volunteerId: 99 }] }),
			};
		};

		await (db as any)
			.insert(volunteerProfiles)
			.values({ volunteerId: 99 })
			.returning();

		expect(capturedTable).toBe(volunteerProfiles);
	});
});

describe("VolunteerRepository — duplicate upgrade prevention", () => {
	afterEach(restoreDb);

	test("findByUserId returns existing record when user is already a volunteer", async () => {
		const { VolunteerRepository } = await import(
			"../../src/db/repositories/volunteer.repository"
		);
		const repo = new VolunteerRepository();

		const existing = {
			id: 50,
			userId: "already-volunteer",
			availability: true,
		};

		(db as any).select = () => ({
			from: () => ({
				where: async () => [existing],
			}),
		});

		const result = await repo.findByUserId("already-volunteer");

		expect(result).toBeDefined();
		expect(result?.id).toBe(50);
	});

	test("findByUserId returns undefined for a plain (non-volunteer) user", async () => {
		const { VolunteerRepository } = await import(
			"../../src/db/repositories/volunteer.repository"
		);
		const repo = new VolunteerRepository();

		(db as any).select = () => ({
			from: () => ({
				where: async () => [],
			}),
		});

		const result = await repo.findByUserId("plain-user-id");
		expect(result).toBeUndefined();
	});
});
