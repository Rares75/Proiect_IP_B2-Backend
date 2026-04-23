import { afterEach, describe, expect, test } from "bun:test";
import { db } from "../../src/db";
import { ratings, taskAssignments, volunteers } from "../../src/db/schema";
import {
	RatingsRepository,
	type RatingCreateData,
} from "../../src/db/repositories/ratings.repository";

describe("RatingsRepository", () => {
	const repository = new RatingsRepository();
	const originalSelect = (db as any).select;
	const originalInsert = (db as any).insert;

	afterEach(() => {
		(db as any).select = originalSelect;
		(db as any).insert = originalInsert;
	});

	test("gets ratings for a received user", async () => {
		const expectedRatings = [
			{ id: 1, receivedByUserId: "user-1", stars: 5 },
			{ id: 2, receivedByUserId: "user-1", stars: 4 },
		];
		let fromTable: unknown;

		(db as any).select = () => ({
			from: (table: unknown) => {
				fromTable = table;
				return {
					where: async () => expectedRatings,
				};
			},
		});

		const result = await repository.getRatingsByReceivedUserId("user-1");

		expect(result).toMatchObject(expectedRatings);
		expect(fromTable).toBe(ratings);
	});

	test("gets a task assignment by id", async () => {
		const expectedTaskAssignment = [{ id: 7, status: "COMPLETED" }];
		let fromTable: unknown;

		(db as any).select = () => ({
			from: (table: unknown) => {
				fromTable = table;
				return {
					where: async () => expectedTaskAssignment,
				};
			},
		});

		const result = await repository.getTaskAssignmentById(7);

		expect(result).toMatchObject(expectedTaskAssignment);
		expect(fromTable).toBe(taskAssignments);
	});

	test("gets a volunteer by id", async () => {
		const expectedVolunteer = [{ id: 3, userId: "volunteer-1" }];
		let fromTable: unknown;

		(db as any).select = () => ({
			from: (table: unknown) => {
				fromTable = table;
				return {
					where: async () => expectedVolunteer,
				};
			},
		});

		const result = await repository.getVolunteerById(3);

		expect(result).toMatchObject(expectedVolunteer);
		expect(fromTable).toBe(volunteers);
	});

	test("finds an existing rating for the task and users", async () => {
		const expectedRatings = [
			{
				id: 9,
				taskAssignmentId: 11,
				writtenByUserId: "writer-1",
				receivedByUserId: "receiver-1",
			},
		];

		(db as any).select = () => ({
			from: () => ({
				where: async () => expectedRatings,
			}),
		});

		const result = await repository.findRating(11, "writer-1", "receiver-1");

		expect(result).toMatchObject(expectedRatings);
	});

	test("creates a rating with the provided payload", async () => {
		const input: RatingCreateData = {
			taskAssignmentId: 15,
			writtenByUserId: "writer-2",
			receivedByUserId: "receiver-2",
			stars: 5,
			comment: "great work",
		};
		const expectedCreatedRows = [{ id: 20, ...input }];
		let insertedTable: unknown;
		let insertedValues: unknown;

		(db as any).insert = (table: unknown) => {
			insertedTable = table;
			return {
				values: (values: unknown) => {
					insertedValues = values;
					return {
						returning: async () => expectedCreatedRows,
					};
				},
			};
		};

		const result = await repository.createRating(input);

		expect(result).toMatchObject(expectedCreatedRows);
		expect(insertedTable).toBe(ratings);
		expect(insertedValues).toEqual(input);
	});

	test("gets the ratings summary for a user", async () => {
		const expectedSummary = [{ averageRating: "4.50", ratingsCount: 2 }];
		let selectShape: unknown;

		(db as any).select = (shape: unknown) => {
			selectShape = shape;
			return {
				from: () => ({
					where: async () => expectedSummary,
				}),
			};
		};

		const result = await repository.getRatingsSummaryByUserId("user-3");

		expect(result).toEqual(expectedSummary);
		expect(selectShape).toMatchObject({
			averageRating: expect.anything(),
			ratingsCount: expect.anything(),
		});
	});

	test("gets only the five most recent ratings for a user", async () => {
		const expectedRecentRatings = [
			{ id: 6, comment: "latest" },
			{ id: 5, comment: "recent-5" },
			{ id: 4, comment: "recent-4" },
			{ id: 3, comment: "recent-3" },
			{ id: 2, comment: "recent-2" },
		];
		let receivedLimit: number | undefined;
		let orderByCalled = false;

		(db as any).select = () => ({
			from: () => ({
				where: () => ({
					orderBy: () => {
						orderByCalled = true;
						return {
							limit: async (value: number) => {
								receivedLimit = value;
								return expectedRecentRatings;
							},
						};
					},
				}),
			}),
		});

		const result = await repository.getRecentRatingsByReceivedUserId("user-4");

		expect(result).toMatchObject(expectedRecentRatings);
		expect(orderByCalled).toBe(true);
		expect(receivedLimit).toBe(5);
	});
});
