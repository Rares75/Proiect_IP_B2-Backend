import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { UserManagementService } from "../../src/services/UserManagementService";
import { logger } from "../../src/utils/logger";

describe("UserManagementService", () => {
	const originalException = logger.exception;
	const originalInfo = logger.info;
	let loggedExceptions: Error[];
	let infoMessages: string[];

	beforeEach(() => {
		loggedExceptions = [];
		infoMessages = [];
		logger.exception = (error: Error | unknown) => {
			loggedExceptions.push(error as Error);
		};
		logger.info = (message: string) => {
			infoMessages.push(message);
		};
	});

	afterEach(() => {
		logger.exception = originalException;
		logger.info = originalInfo;
	});

	const createService = ({
		ratingService,
		userRepo,
		userAccessRepo,
	}: {
		ratingService: unknown;
		userRepo: unknown;
		userAccessRepo: unknown;
	}) =>
		new UserManagementService(
			ratingService as any,
			userRepo as any,
			userAccessRepo as any,
		);

	test("returns false when the user cannot be found", async () => {
		const service = createService({
			userRepo: {
				findById: async () => undefined,
			},
			userAccessRepo: {
				findFirstBy: async () => ({ id: 1 }),
			},
			ratingService: {
				getRecentRatingsForUser: async () => [],
			},
		});

		const result = await service.banUser("missing-user", "abuse");

		expect(result).toBe(false);
		expect(loggedExceptions).toHaveLength(1);
		expect(loggedExceptions[0]?.message).toBe("User not found");
	});

	test("returns false when recent ratings cannot be fetched", async () => {
		const service = createService({
			userRepo: {
				findById: async () => ({ id: "user-1" }),
			},
			userAccessRepo: {
				findFirstBy: async () => ({ id: 1, userId: "user-1" }),
			},
			ratingService: {
				getRecentRatingsForUser: async () => null,
			},
		});

		const result = await service.banUser("user-1", "abuse");

		expect(result).toBe(false);
		expect(loggedExceptions).toHaveLength(1);
		expect(loggedExceptions[0]?.message).toBe("Failed to fetch user ratings");
	});

	test("does not ban a user with fewer than five recent ratings", async () => {
		let updateCalled = false;

		const service = createService({
			userRepo: {
				findById: async () => ({ id: "user-2" }),
			},
			userAccessRepo: {
				findFirstBy: async () => ({ id: 2, userId: "user-2" }),
				update: async () => {
					updateCalled = true;
					return undefined;
				},
			},
			ratingService: {
				getRecentRatingsForUser: async () => [
					{ stars: 1 },
					{ stars: 2 },
					{ stars: 2 },
					{ stars: 1 },
				],
			},
		});

		const result = await service.banUser("user-2", "abuse");

		expect(result).toBe(false);
		expect(updateCalled).toBe(false);
		expect(loggedExceptions).toHaveLength(0);
	});

	test("does not ban a user when one of the last five ratings is not below three stars", async () => {
		let updateCalled = false;

		const service = createService({
			userRepo: {
				findById: async () => ({ id: "user-3" }),
			},
			userAccessRepo: {
				findFirstBy: async () => ({ id: 3, userId: "user-3" }),
				update: async () => {
					updateCalled = true;
					return undefined;
				},
			},
			ratingService: {
				getRecentRatingsForUser: async () => [
					{ stars: 1 },
					{ stars: 2 },
					{ stars: 2 },
					{ stars: 3 },
					{ stars: 1 },
				],
			},
		});

		const result = await service.banUser("user-3", "abuse");

		expect(result).toBe(false);
		expect(updateCalled).toBe(false);
		expect(loggedExceptions).toHaveLength(0);
	});

	test("returns false and logs when the user access update fails", async () => {
		const service = createService({
			userRepo: {
				findById: async () => ({ id: "user-4" }),
			},
			userAccessRepo: {
				findFirstBy: async () => ({ id: 4, userId: "user-4" }),
				update: async () => undefined,
			},
			ratingService: {
				getRecentRatingsForUser: async () => [
					{ stars: 1 },
					{ stars: 2 },
					{ stars: 2 },
					{ stars: 1 },
					{ stars: 2 },
				],
			},
		});

		const result = await service.banUser("user-4", "abuse");

		expect(result).toBe(false);
		expect(infoMessages).toHaveLength(1);
		expect(loggedExceptions).toHaveLength(1);
		expect(loggedExceptions[0]?.message).toBe(
			"Failed to update user access status to BLOCKED",
		);
	});

	test("blocks the user when the last five ratings are all below three stars", async () => {
		const updateCalls: Array<{
			accessId: number;
			data: Record<string, unknown>;
		}> = [];

		const service = createService({
			userRepo: {
				findById: async () => ({ id: "user-5" }),
			},
			userAccessRepo: {
				findFirstBy: async () => ({ id: 5, userId: "user-5" }),
				update: async (accessId: number, data: Record<string, unknown>) => {
					updateCalls.push({ accessId, data });
					return { id: accessId, ...data };
				},
			},
			ratingService: {
				getRecentRatingsForUser: async () => [
					{ stars: 1 },
					{ stars: 2 },
					{ stars: 1 },
					{ stars: 2 },
					{ stars: 1 },
				],
			},
		});

		const result = await service.banUser("user-5", "multiple bad ratings");

		expect(result).toBe(true);
		expect(updateCalls).toHaveLength(1);
		expect(updateCalls[0]?.accessId).toBe(5);
		expect(updateCalls[0]?.data.status).toBe("BLOCKED");
		expect(updateCalls[0]?.data.bannedReason).toBe("multiple bad ratings");
		expect(updateCalls[0]?.data.bannedAt).toBeInstanceOf(Date);
		expect(infoMessages).toEqual([
			"Banning user user-5 because last 5 ratings are below 3 stars",
		]);
		expect(loggedExceptions).toHaveLength(0);
	});
});
