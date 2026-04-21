import { afterEach, describe, expect, test } from "bun:test";
import { db } from "../../db";
import { volunteers } from "../profile";
import { UserRepository } from "./user.repository";
import { VolunteerRepository } from "./volunteer.repository";

describe("VolunteerRepository tests", () => {
	const userRepository = new UserRepository();
	const volunteerRepository = new VolunteerRepository();
	const originalSelect = (db as any).select;
	const originalInsert = (db as any).insert;
	const originalUpdate = (db as any).update;
	const originalDelete = (db as any).delete;
	const originalFindById = volunteerRepository.findById;

	afterEach(() => {
		(db as any).select = originalSelect;
		(db as any).insert = originalInsert;
		(db as any).update = originalUpdate;
		(db as any).delete = originalDelete;
		volunteerRepository.findById = originalFindById;
	});

	test("should create a test user and volunteer", async () => {
		const createdUser = {
			id: "user-1",
			name: "test volunteer user",
			email: "volunteer@example.com",
			phone: "0744000000",
		};
		const createdVolunteer = {
			id: 1,
			userId: createdUser.id,
			availability: true,
			trustScore: 0,
			completedTasks: 0,
		};
		const insertedTables: unknown[] = [];

		(db as any).insert = (table: unknown) => {
			insertedTables.push(table);
			return {
				values: () => ({
					returning: async () =>
						insertedTables.length === 1 ? [createdUser] : [createdVolunteer],
				}),
			};
		};

		const newUser = await userRepository.create(createdUser as any);
		const newVolunteer = await volunteerRepository.create({
			userId: newUser.id,
			availability: true,
			trustScore: 0,
			completedTasks: 0,
		});

		expect(newUser).toMatchObject(createdUser);
		expect(newVolunteer).toMatchObject(createdVolunteer);
		expect(newVolunteer.userId).toBe(newUser.id);
	});

	test("should find volunteer by id", async () => {
		const expectedVolunteer = { id: 2, userId: "user-2" };
		let fromTable: unknown;

		(db as any).select = () => ({
			from: (table: unknown) => {
				fromTable = table;
				return {
					where: async () => [expectedVolunteer],
				};
			},
		});

		const found = await volunteerRepository.findById(2);

		expect(found).toMatchObject(expectedVolunteer);
		expect(fromTable).toBe(volunteers);
	});

	test("should find volunteer by userId", async () => {
		const expectedVolunteer = { id: 3, userId: "user-3" };
		let fromTable: unknown;

		(db as any).select = () => ({
			from: (table: unknown) => {
				fromTable = table;
				return {
					where: async () => [expectedVolunteer],
				};
			},
		});

		const found = await volunteerRepository.findByUserId("user-3");

		expect(found).toMatchObject(expectedVolunteer);
		expect(fromTable).toBe(volunteers);
	});

	test("should return empty ratings for new volunteer", async () => {
		volunteerRepository.findById = async () =>
			({ id: 4, userId: "user-4" }) as any;

		(db as any).select = () => ({
			from: () => ({
				where: async () => [],
			}),
		});

		const { ratings, averageStars } =
			await volunteerRepository.findRatingsById(4);

		expect(ratings).toEqual([]);
		expect(averageStars).toBeNull();
	});

	test("should update volunteer availability", async () => {
		const expectedVolunteer = { id: 5, availability: false };
		let updatedTable: unknown;
		let updatedValues: unknown;

		(db as any).update = (table: unknown) => {
			updatedTable = table;
			return {
				set: (values: unknown) => {
					updatedValues = values;
					return {
						where: () => ({
							returning: async () => [expectedVolunteer],
						}),
					};
				},
			};
		};

		const updated = await volunteerRepository.update(5, {
			availability: false,
		});

		expect(updated).toMatchObject(expectedVolunteer);
		expect(updatedTable).toBe(volunteers);
		expect(updatedValues).toEqual({ availability: false });
	});

	test("should confirm volunteer exists", async () => {
		(db as any).select = () => ({
			from: () => ({
				where: async () => [{ value: 1 }],
			}),
		});

		const exists = await volunteerRepository.exists(6);

		expect(exists).toBe(true);
	});

	test("should count volunteers successfully", async () => {
		(db as any).select = () => ({
			from: async () => [{ value: 2 }],
		});

		const total = await volunteerRepository.count();

		expect(total).toBe(2);
	});

	test("should delete volunteer and user", async () => {
		let deletedVolunteerTable: unknown;
		let deletedUser = false;

		(db as any).delete = (table: unknown) => {
			if (table === volunteers) {
				deletedVolunteerTable = table;
			} else {
				deletedUser = true;
			}

			return {
				where: () => ({
					returning: async () => [{ id: "deleted-id" }],
				}),
			};
		};
		(db as any).select = () => ({
			from: () => ({
				where: async () => [{ value: 0 }],
			}),
		});

		const isDeleted = await volunteerRepository.delete(7);
		const exists = await volunteerRepository.exists(7);
		await userRepository.delete("user-7");

		expect(isDeleted).toBe(true);
		expect(exists).toBe(false);
		expect(deletedVolunteerTable).toBe(volunteers);
		expect(deletedUser).toBe(true);
	});
});
