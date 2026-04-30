import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { logger } from "../../src/utils/logger";
import { RatingException } from "../../src/exceptions/ratings/RatingException";

const { RatingsService } = await import("../../src/services/RatingsService");

describe("RatingsService", () => {
	const originalException = logger.exception;
	let loggedExceptions: Array<RatingException | Error>;

	beforeEach(() => {
		loggedExceptions = [];
		logger.exception = (error: Error | unknown) => {
			loggedExceptions.push(error as RatingException);
		};
	});

	afterEach(() => {
		logger.exception = originalException;
	});

	const createService = (ratingRepo: unknown) =>
		new RatingsService(ratingRepo as any);

	describe("createRating", () => {
		test("should return null when user tries to rate themselves", async () => {
			const service = createService({
				getTaskAssignmentById: async () => [{}],
				getVolunteerById: async () => [{ userId: "user-1" }],
			});

			const result = await service.createRating({
				taskAssignmentId: 1,
				writtenByUserId: "user-1",
				receivedByUserId: "user-1",
				stars: 5,
				comment: "Good job",
			});

			expect(result).toBeNull();
			expect(loggedExceptions).toHaveLength(1);
			expect(loggedExceptions[0]?.message).toContain("cannot rate yourself");
		});

		test("should return null when task assignment is not found", async () => {
			const service = createService({
				getTaskAssignmentById: async () => [],
			});

			const result = await service.createRating({
				taskAssignmentId: 999,
				writtenByUserId: "user-1",
				receivedByUserId: "user-2",
				stars: 5,
				comment: "Good work",
			});

			expect(result).toBeNull();
			expect(loggedExceptions).toHaveLength(1);
			expect(loggedExceptions[0]?.message).toContain(
				"Task assignment not found",
			);
		});

		test("should return null when task is not completed", async () => {
			const service = createService({
				getTaskAssignmentById: async () => [{ status: "OPEN" }],
			});

			const result = await service.createRating({
				taskAssignmentId: 1,
				writtenByUserId: "user-1",
				receivedByUserId: "user-2",
				stars: 5,
				comment: "Good work",
			});

			expect(result).toBeNull();
			expect(loggedExceptions).toHaveLength(1);
			expect(loggedExceptions[0]?.message).toContain(
				"Rating can only be given after task completion",
			);
		});

		test("should return null when volunteer is not found", async () => {
			const service = createService({
				getTaskAssignmentById: async () => [
					{
						status: "COMPLETED",
						handledByVolunteerId: 1,
						requestedByUserId: "user-1",
					},
				],
				getVolunteerById: async () => [],
			});

			const result = await service.createRating({
				taskAssignmentId: 1,
				writtenByUserId: "user-1",
				receivedByUserId: "user-2",
				stars: 5,
				comment: "Good work",
			});

			expect(result).toBeNull();
			expect(loggedExceptions).toHaveLength(1);
			expect(loggedExceptions[0]?.message).toContain("Volunteer not found");
		});

		test("should return null when rating participants are invalid", async () => {
			const service = createService({
				getTaskAssignmentById: async () => [
					{
						status: "COMPLETED",
						handledByVolunteerId: 1,
						requestedByUserId: "user-1",
					},
				],
				getVolunteerById: async () => [{ userId: "user-2" }],
			});

			const result = await service.createRating({
				taskAssignmentId: 1,
				writtenByUserId: "user-3",
				receivedByUserId: "user-4",
				stars: 5,
				comment: "Good work",
			});

			expect(result).toBeNull();
			expect(loggedExceptions).toHaveLength(1);
			expect(loggedExceptions[0]?.message).toContain(
				"Invalid rating participants",
			);
		});

		test("should return null when rating already exists", async () => {
			const service = createService({
				getTaskAssignmentById: async () => [
					{
						status: "COMPLETED",
						handledByVolunteerId: 1,
						requestedByUserId: "user-1",
					},
				],
				getVolunteerById: async () => [{ userId: "user-2" }],
				findRating: async () => [{ id: 1 }],
			});

			const result = await service.createRating({
				taskAssignmentId: 1,
				writtenByUserId: "user-1",
				receivedByUserId: "user-2",
				stars: 5,
				comment: "Good work",
			});

			expect(result).toBeNull();
			expect(loggedExceptions).toHaveLength(1);
			expect(loggedExceptions[0]?.message).toContain(
				"Rating already exists",
			);
		});

		test("should successfully create a rating when requester rates volunteer", async () => {
			const createdRating = {
				id: 1,
				taskAssignmentId: 1,
				writtenByUserId: "user-1",
				receivedByUserId: "user-2",
				stars: 5,
				comment: "Excellent work",
			};

			const service = createService({
				getTaskAssignmentById: async () => [
					{
						status: "COMPLETED",
						handledByVolunteerId: 1,
						requestedByUserId: "user-1",
					},
				],
				getVolunteerById: async () => [{ userId: "user-2" }],
				findRating: async () => [],
				createRating: async (data: unknown) => [createdRating],
			});

			const result = await service.createRating({
				taskAssignmentId: 1,
				writtenByUserId: "user-1",
				receivedByUserId: "user-2",
				stars: 5,
				comment: "  Excellent work  ",
			});

			expect(result).toMatchObject(createdRating);
			expect(loggedExceptions).toHaveLength(0);
		});

		test("should successfully create a rating when volunteer rates requester", async () => {
			const createdRating = {
				id: 1,
				taskAssignmentId: 1,
				writtenByUserId: "user-2",
				receivedByUserId: "user-1",
				stars: 4,
				comment: "Good requester",
			};

			const service = createService({
				getTaskAssignmentById: async () => [
					{
						status: "COMPLETED",
						handledByVolunteerId: 1,
						requestedByUserId: "user-1",
					},
				],
				getVolunteerById: async () => [{ userId: "user-2" }],
				findRating: async () => [],
				createRating: async () => [createdRating],
			});

			const result = await service.createRating({
				taskAssignmentId: 1,
				writtenByUserId: "user-2",
				receivedByUserId: "user-1",
				stars: 4,
				comment: "Good requester",
			});

			expect(result).toMatchObject(createdRating);
			expect(loggedExceptions).toHaveLength(0);
		});

		test("should return null and log when repository throws error", async () => {
			const service = createService({
				getTaskAssignmentById: async () => {
					throw new Error("Database connection failed");
				},
			});

			const result = await service.createRating({
				taskAssignmentId: 1,
				writtenByUserId: "user-1",
				receivedByUserId: "user-2",
				stars: 5,
				comment: "Good work",
			});

			expect(result).toBeNull();
			expect(loggedExceptions).toHaveLength(1);
			expect(loggedExceptions[0]?.message).toContain(
				"Failed to create rating",
			);
		});

		test("should return null when createRating returns empty array", async () => {
			const service = createService({
				getTaskAssignmentById: async () => [
					{
						status: "COMPLETED",
						handledByVolunteerId: 1,
						requestedByUserId: "user-1",
					},
				],
				getVolunteerById: async () => [{ userId: "user-2" }],
				findRating: async () => [],
				createRating: async () => [],
			});

			const result = await service.createRating({
				taskAssignmentId: 1,
				writtenByUserId: "user-1",
				receivedByUserId: "user-2",
				stars: 5,
				comment: "Good work",
			});

			expect(result).toBeNull();
		});
	});

	describe("getRatingsForUser", () => {
		test("should return ratings for user when valid userId is provided", async () => {
			const expectedRatings = [
				{ id: 1, stars: 5, comment: "Great!" },
				{ id: 2, stars: 4, comment: "Good" },
			];

			const service = createService({
				getRatingsByReceivedUserId: async (userId: string) =>
					userId === "user-1" ? expectedRatings : [],
			});

			const result = await service.getRatingsForUser("user-1");

			expect(result).toMatchObject(expectedRatings);
			expect(loggedExceptions).toHaveLength(0);
		});

		test("should return null when userId is empty", async () => {
			let repoCalled = false;

			const service = createService({
				getRatingsByReceivedUserId: async () => {
					repoCalled = true;
					return [];
				},
			});

			const result = await service.getRatingsForUser("");

			expect(result).toBeNull();
			expect(repoCalled).toBe(false);
			expect(loggedExceptions).toHaveLength(1);
			expect(loggedExceptions[0]?.message).toContain(
				"User ID is required to fetch ratings",
			);
		});

		test("should return null and log when repository throws error", async () => {
			const service = createService({
				getRatingsByReceivedUserId: async () => {
					throw new Error("Database error");
				},
			});

			const result = await service.getRatingsForUser("user-1");

			expect(result).toBeNull();
			expect(loggedExceptions).toHaveLength(1);
			expect(loggedExceptions[0]?.message).toContain(
				"Failed to fetch ratings for user",
			);
		});

		test("should return empty array when user has no ratings", async () => {
			const service = createService({
				getRatingsByReceivedUserId: async () => [],
			});

			const result = await service.getRatingsForUser("user-no-ratings");

			expect(result).toEqual([]);
			expect(loggedExceptions).toHaveLength(0);
		});
	});

	describe("getRatingsSummaryForUser", () => {
		test("should return rating summary for user with valid userId", async () => {
			const expectedSummary = {
				averageRating: 4.5,
				ratingsCount: 10,
			};

			const service = createService({
				getRatingsSummaryByUserId: async (userId: string) =>
					userId === "user-1" ? [expectedSummary] : [],
			});

			const result = await service.getRatingsSummaryForUser("user-1");

			expect(result).toMatchObject(expectedSummary);
			expect(loggedExceptions).toHaveLength(0);
		});

		test("should return null when userId is empty", async () => {
			let repoCalled = false;

			const service = createService({
				getRatingsSummaryByUserId: async () => {
					repoCalled = true;
					return [];
				},
			});

			const result = await service.getRatingsSummaryForUser("");

			expect(result).toBeNull();
			expect(repoCalled).toBe(false);
			expect(loggedExceptions).toHaveLength(1);
			expect(loggedExceptions[0]?.message).toContain(
				"User ID is required for ratings summary",
			);
		});

		test("should return null when repository returns empty array", async () => {
			const service = createService({
				getRatingsSummaryByUserId: async () => [],
			});

			const result = await service.getRatingsSummaryForUser("user-no-summary");

			expect(result).toBeNull();
			expect(loggedExceptions).toHaveLength(0);
		});

		test("should return null and log when repository throws error", async () => {
			const service = createService({
				getRatingsSummaryByUserId: async () => {
					throw new Error("Database error");
				},
			});

			const result = await service.getRatingsSummaryForUser("user-1");

			expect(result).toBeNull();
			expect(loggedExceptions).toHaveLength(1);
			expect(loggedExceptions[0]?.message).toContain(
				"Failed to fetch ratings summary",
			);
		});
	});

	describe("getRecentRatingsForUser", () => {
		test("should return recent ratings for user with valid userId", async () => {
			const expectedRatings = [
				{ id: 5, stars: 5, comment: "Latest" },
				{ id: 4, stars: 4, comment: "Recent" },
			];

			const service = createService({
				getRecentRatingsByReceivedUserId: async (userId: string) =>
					userId === "user-1" ? expectedRatings : [],
			});

			const result = await service.getRecentRatingsForUser("user-1");

			expect(result).toMatchObject(expectedRatings);
			expect(loggedExceptions).toHaveLength(0);
		});

		test("should return null when userId is empty", async () => {
			let repoCalled = false;

			const service = createService({
				getRecentRatingsByReceivedUserId: async () => {
					repoCalled = true;
					return [];
				},
			});

			const result = await service.getRecentRatingsForUser("");

			expect(result).toBeNull();
			expect(repoCalled).toBe(false);
			expect(loggedExceptions).toHaveLength(1);
			expect(loggedExceptions[0]?.message).toContain(
				"User ID is required to fetch recent ratings",
			);
		});

		test("should return null and log when repository throws error", async () => {
			const service = createService({
				getRecentRatingsByReceivedUserId: async () => {
					throw new Error("Database error");
				},
			});

			const result = await service.getRecentRatingsForUser("user-1");

			expect(result).toBeNull();
			expect(loggedExceptions).toHaveLength(1);
			expect(loggedExceptions[0]?.message).toContain(
				"Failed to fetch recent ratings for user",
			);
		});

		test("should return empty array when user has no recent ratings", async () => {
			const service = createService({
				getRecentRatingsByReceivedUserId: async () => [],
			});

			const result = await service.getRecentRatingsForUser("user-no-recent");

			expect(result).toEqual([]);
			expect(loggedExceptions).toHaveLength(0);
		});
	});
});
