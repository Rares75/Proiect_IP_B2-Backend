import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { logger } from "../../src/utils/logger";

const { AccountService } = await import("../../src/services/AccountService");

describe("AccountService", () => {
	const originalException = logger.exception;
	let loggedExceptions: Error[];

	beforeEach(() => {
		loggedExceptions = [];
		logger.exception = (error: Error | unknown) => {
			loggedExceptions.push(error as Error);
		};
	});

	afterEach(() => {
		logger.exception = originalException;
	});

	const createService = (accountRepo: unknown) =>
		new AccountService(accountRepo as any);

	test("creates an account through the repository", async () => {
		const createdAccount = {
			id: "account-1",
			userId: "user-1",
			status: "ACTIVE",
		};

		const service = createService({
			create: async (data: unknown) => ({
				...createdAccount,
				payload: data,
			}),
		});

		const result = await service.createAccount({
			id: "account-1",
			accountId: "provider-account-1",
			providerId: "credentials",
			userId: "user-1",
			status: "ACTIVE",
		} as any);

		expect(result).toMatchObject(createdAccount);
		expect(loggedExceptions).toHaveLength(0);
	});

	test("returns null and logs when account creation fails", async () => {
		const service = createService({
			create: async () => {
				throw new Error("insert failed");
			},
		});

		const result = await service.createAccount({} as any);

		expect(result).toBeNull();
		expect(loggedExceptions).toHaveLength(1);
		expect(loggedExceptions[0]?.message).toContain("Failed to create account");
	});

	test("returns null for an empty account id before calling the repository", async () => {
		let repositoryCalled = false;

		const service = createService({
			findById: async () => {
				repositoryCalled = true;
				return undefined;
			},
		});

		const result = await service.getAccountById("");

		expect(result).toBeNull();
		expect(repositoryCalled).toBe(false);
		expect(loggedExceptions).toHaveLength(1);
		expect(loggedExceptions[0]?.message).toBe("Account ID is required");
	});

	test("returns the account for a valid user id and logs when missing", async () => {
		const account = { id: "account-2", userId: "user-2", status: "ACTIVE" };

		const service = createService({
			findFirstBy: async ({ userId }: { userId: string }) =>
				userId === "user-2" ? account : undefined,
		});

		const found = await service.getAccountByUserId("user-2");
		const missing = await service.getAccountByUserId("missing-user");

		expect(found).toMatchObject(account);
		expect(missing).toBeNull();
		expect(loggedExceptions).toHaveLength(1);
		expect(loggedExceptions[0]?.message).toBe("Account not found for user");
	});

	test("updates an account and returns null when the repository cannot update it", async () => {
		const updateCalls: Array<{ accountId: string; data: unknown }> = [];

		const service = createService({
			update: async (accountId: string, data: unknown) => {
				updateCalls.push({ accountId, data });
				return accountId === "account-3"
					? { id: accountId, status: "BLOCKED", ...(data as object) }
					: undefined;
			},
		});

		const updated = await service.updateAccount("account-3", {
			status: "BLOCKED",
		} as any);
		const missing = await service.updateAccount("missing-account", {
			status: "BLOCKED",
		} as any);

		expect(updated).toMatchObject({ id: "account-3", status: "BLOCKED" });
		expect(missing).toBeNull();
		expect(updateCalls).toHaveLength(2);
		expect(loggedExceptions).toHaveLength(1);
		expect(loggedExceptions[0]?.message).toBe("Failed to update account");
	});

	test("delegates delete and existence checks to the repository", async () => {
		const deletedIds: string[] = [];
		const existsIds: string[] = [];

		const service = createService({
			delete: async (accountId: string) => {
				deletedIds.push(accountId);
				return accountId === "account-4";
			},
			exists: async (accountId: string) => {
				existsIds.push(accountId);
				return accountId === "account-4";
			},
		});

		expect(await service.deleteAccount("account-4")).toBe(true);
		expect(await service.accountExists("account-4")).toBe(true);
		expect(await service.deleteAccount("")).toBe(false);
		expect(await service.accountExists("")).toBe(false);
		expect(deletedIds).toEqual(["account-4"]);
		expect(existsIds).toEqual(["account-4"]);
		expect(loggedExceptions.map((error) => error.message)).toEqual([
			"Account ID is required",
			"Account ID is required",
		]);
	});

	test("returns an empty list when fetching accounts fails", async () => {
		const service = createService({
			findMany: async () => {
				throw new Error("db unavailable");
			},
		});

		const result = await service.getAccounts();

		expect(result).toEqual([]);
		expect(loggedExceptions).toHaveLength(1);
		expect(loggedExceptions[0]?.message).toContain("Failed to fetch accounts");
	});

	test("returns the user's account status and logs when the account is missing", async () => {
		const service = createService({
			findFirstBy: async ({ userId }: { userId: string }) =>
				userId === "user-5" ? { status: "ACTIVE" } : undefined,
		});

		const status = await service.checkUserStatus("user-5");
		const missing = await service.checkUserStatus("missing-user");

		expect(status).toBe("ACTIVE");
		expect(missing).toBeNull();
		expect(loggedExceptions).toHaveLength(1);
		expect(loggedExceptions[0]?.message).toBe("Account not found for user");
	});
});
