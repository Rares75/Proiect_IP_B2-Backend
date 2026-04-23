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
		accountRepo,
	}: {
		ratingService: unknown;
		userRepo: unknown;
		accountRepo: unknown;
	}) =>
		new UserManagementService(
			ratingService as any,
			userRepo as any,
			accountRepo as any,
		);

	test("returns false when the user or account cannot be found", async () => {
		const service = createService({
			userRepo: {
				findById: async () => undefined,
			},
			accountRepo: {
				findFirstBy: async () => ({ id: "account-1" }),
			},
			ratingService: {
				getRecentRatingsForUser: async () => [],
			},
		});

		const result = await service.banUser("missing-user", "abuse");

		expect(result).toBe(false);
		expect(loggedExceptions).toHaveLength(1);
		expect(loggedExceptions[0]?.message).toBe("User or account not found");
	});

	test("returns false when recent ratings cannot be fetched", async () => {
		const service = createService({
			userRepo: {
				findById: async () => ({ id: "user-1" }),
			},
			accountRepo: {
				findFirstBy: async () => ({ id: "account-1", userId: "user-1" }),
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
			accountRepo: {
				findFirstBy: async () => ({ id: "account-2", userId: "user-2" }),
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
			accountRepo: {
				findFirstBy: async () => ({ id: "account-3", userId: "user-3" }),
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

	test("returns false and logs when the account update fails", async () => {
		const service = createService({
			userRepo: {
				findById: async () => ({ id: "user-4" }),
			},
			accountRepo: {
				findFirstBy: async () => ({ id: "account-4", userId: "user-4" }),
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
			"Failed to update account status to BLOCKED",
		);
	});

	test("blocks the account when the last five ratings are all below three stars", async () => {
		const updateCalls: Array<{
			accountId: string;
			data: Record<string, unknown>;
		}> = [];

		const service = createService({
			userRepo: {
				findById: async () => ({ id: "user-5" }),
			},
			accountRepo: {
				findFirstBy: async () => ({ id: "account-5", userId: "user-5" }),
				update: async (accountId: string, data: Record<string, unknown>) => {
					updateCalls.push({ accountId, data });
					return { id: accountId, ...data };
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
		expect(updateCalls[0]?.accountId).toBe("account-5");
		expect(updateCalls[0]?.data.status).toBe("BLOCKED");
		expect(updateCalls[0]?.data.bannedReason).toBe("multiple bad ratings");
		expect(updateCalls[0]?.data.banned_at).toBeInstanceOf(Date);
		expect(infoMessages).toEqual([
			"Banning user user-5 because last 5 ratings are below 3 stars",
		]);
		expect(loggedExceptions).toHaveLength(0);
	});
});
