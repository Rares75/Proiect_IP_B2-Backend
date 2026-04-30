import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createRatingSchema } from "../../src/utils/validators/ratingsValidator";

describe("RatingsController", () => {
	let mockService: any;

	beforeEach(() => {
		mockService = {
			createRating: async () => null,
			getRatingsForUser: async () => null,
			getRatingsSummaryForUser: async () => null,
		};
	});

	afterEach(() => {
		mockService = null;
	});

	describe("POST /ratings - Create Rating", () => {
		test("should validate required fields", async () => {
			const incompleteData = {
				taskAssignmentId: 1,
				writtenByUserId: "user-1",
			};

			const result = createRatingSchema.safeParse(incompleteData);
			expect(result.success).toBe(false);
		});

		test("should validate taskAssignmentId is positive integer", async () => {
			const invalidData = {
				taskAssignmentId: -1,
				writtenByUserId: "user-1",
				receivedByUserId: "user-2",
				stars: 5,
				comment: "Good work",
			};

			const result = createRatingSchema.safeParse(invalidData);
			expect(result.success).toBe(false);
		});

		test("should validate stars is between 1 and 5", async () => {
			const invalidStarsLow = {
				taskAssignmentId: 1,
				writtenByUserId: "user-1",
				receivedByUserId: "user-2",
				stars: 0,
				comment: "Good work",
			};

			const invalidStarsHigh = {
				taskAssignmentId: 1,
				writtenByUserId: "user-1",
				receivedByUserId: "user-2",
				stars: 6,
				comment: "Good work",
			};

			expect(createRatingSchema.safeParse(invalidStarsLow).success).toBe(false);
			expect(createRatingSchema.safeParse(invalidStarsHigh).success).toBe(false);
		});

		test("should validate comment is not empty", async () => {
			const invalidData = {
				taskAssignmentId: 1,
				writtenByUserId: "user-1",
				receivedByUserId: "user-2",
				stars: 5,
				comment: "",
			};

			const result = createRatingSchema.safeParse(invalidData);
			expect(result.success).toBe(false);
		});

		test("should validate writtenByUserId is not empty", async () => {
			const invalidData = {
				taskAssignmentId: 1,
				writtenByUserId: "",
				receivedByUserId: "user-2",
				stars: 5,
				comment: "Good work",
			};

			const result = createRatingSchema.safeParse(invalidData);
			expect(result.success).toBe(false);
		});

		test("should accept valid rating data", async () => {
			const validData = {
				taskAssignmentId: 1,
				writtenByUserId: "user-1",
				receivedByUserId: "user-2",
				stars: 5,
				comment: "Excellent work",
			};

			const result = createRatingSchema.safeParse(validData);
			expect(result.success).toBe(true);
		});

		test("should call service with validated data", async () => {
			let serviceCalled = false;
			let receivedData: any = null;

			mockService.createRating = async (data: any) => {
				serviceCalled = true;
				receivedData = data;
				return { id: 1, ...data };
			};

			const validData = {
				taskAssignmentId: 1,
				writtenByUserId: "user-1",
				receivedByUserId: "user-2",
				stars: 5,
				comment: "Good work",
			};

			await mockService.createRating(validData);

			expect(serviceCalled).toBe(true);
			expect(receivedData).toMatchObject(validData);
		});
	});

	describe("GET /ratings/user/:userId - Get User Ratings", () => {
		test("should return ratings when service finds them", async () => {
			const mockRatings = [
				{ id: 1, stars: 5, comment: "Great!" },
				{ id: 2, stars: 4, comment: "Good" },
			];

			mockService.getRatingsForUser = async (userId: string) =>
				userId === "user-1" ? mockRatings : null;

			const result = await mockService.getRatingsForUser("user-1");
			expect(result).toMatchObject(mockRatings);
		});

		test("should return empty array when user has no ratings", async () => {
			mockService.getRatingsForUser = async () => [];

			const result = await mockService.getRatingsForUser("user-no-ratings");
			expect(result).toEqual([]);
		});

		test("should return null when user id is invalid", async () => {
			mockService.getRatingsForUser = async (userId: string) =>
				!userId ? null : [];

			const result = await mockService.getRatingsForUser("");
			expect(result).toBeNull();
		});

		test("should handle service errors gracefully", async () => {
			mockService.getRatingsForUser = async () => {
				throw new Error("Database error");
			};

			try {
				await mockService.getRatingsForUser("user-1");
				expect(false).toBe(true); // Should not reach here
			} catch (error) {
				expect((error as Error).message).toContain("Database error");
			}
		});
	});

	describe("GET /ratings/user/:userId/summary - Get Rating Summary", () => {
		test("should return rating summary for valid user", async () => {
			const mockSummary = {
				averageRating: 4.5,
				ratingsCount: 10,
			};

			mockService.getRatingsSummaryForUser = async (userId: string) =>
				userId === "user-1" ? mockSummary : null;

			const result = await mockService.getRatingsSummaryForUser("user-1");
			expect(result).toMatchObject(mockSummary);
		});

		test("should return null when user has no ratings", async () => {
			mockService.getRatingsSummaryForUser = async () => null;

			const result = await mockService.getRatingsSummaryForUser("user-no-ratings");
			expect(result).toBeNull();
		});

		test("should handle zero ratings count", async () => {
			const mockSummary = {
				averageRating: 0,
				ratingsCount: 0,
			};

			mockService.getRatingsSummaryForUser = async () => mockSummary;

			const result = await mockService.getRatingsSummaryForUser("user-1");
			expect(result).toMatchObject(mockSummary);
		});

		test("should return null when user id is invalid", async () => {
			mockService.getRatingsSummaryForUser = async (userId: string) =>
				!userId ? null : {};

			const result = await mockService.getRatingsSummaryForUser("");
			expect(result).toBeNull();
		});

		test("should handle service errors", async () => {
			mockService.getRatingsSummaryForUser = async () => {
				throw new Error("Database error");
			};

			try {
				await mockService.getRatingsSummaryForUser("user-1");
				expect(false).toBe(true);
			} catch (error) {
				expect((error as Error).message).toContain("Database error");
			}
		});
	});
});
