import {
	AccountRepository,
	type Account,
	type CreateAccountDTO,
	type UpdateAccountDTO,
} from "../db/repositories/account.repository";
import { Service } from "../di/decorators/service";
import { UsermanagementException as UserManagementException } from "../exceptions/user.management/UserManagementException";
import type { AccountStatusType } from "../types";
import { logger } from "../utils/logger";
import { inject } from "../di";

@Service()
export class AccountService {
	constructor(
		@inject(AccountRepository) private readonly accountRepo: AccountRepository,
	) {}

	async createAccount(data: CreateAccountDTO): Promise<Account | null> {
		try {
			return await this.accountRepo.create(data);
		} catch (error) {
			logger.exception(
				new UserManagementException(
					`Failed to create account: ${
						error instanceof Error ? error.message : "Unknown error"
					}`,
				),
			);
			return null;
		}
	}

	async getAccountById(accountId: string): Promise<Account | null> {
		try {
			if (!accountId) {
				logger.exception(new UserManagementException("Account ID is required"));
				return null;
			}

			const account = await this.accountRepo.findById(accountId);
			if (!account) {
				logger.exception(new UserManagementException("Account not found"));
				return null;
			}

			return account;
		} catch (error) {
			logger.exception(
				new UserManagementException(
					`Failed to fetch account by id: ${
						error instanceof Error ? error.message : "Unknown error"
					}`,
				),
			);
			return null;
		}
	}

	async getAccountByUserId(userId: string): Promise<Account | null> {
		try {
			if (!userId) {
				logger.exception(new UserManagementException("User ID is required"));
				return null;
			}

			const account = await this.accountRepo.findFirstBy({ userId });
			if (!account) {
				logger.exception(
					new UserManagementException("Account not found for user"),
				);
				return null;
			}

			return account;
		} catch (error) {
			logger.exception(
				new UserManagementException(
					`Failed to fetch account by user id: ${
						error instanceof Error ? error.message : "Unknown error"
					}`,
				),
			);
			return null;
		}
	}

	async updateAccount(
		accountId: string,
		data: UpdateAccountDTO,
	): Promise<Account | null> {
		try {
			if (!accountId) {
				logger.exception(new UserManagementException("Account ID is required"));
				return null;
			}

			const updatedAccount = await this.accountRepo.update(accountId, data);
			if (!updatedAccount) {
				logger.exception(
					new UserManagementException("Failed to update account"),
				);
				return null;
			}

			return updatedAccount;
		} catch (error) {
			logger.exception(
				new UserManagementException(
					`Failed to update account: ${
						error instanceof Error ? error.message : "Unknown error"
					}`,
				),
			);
			return null;
		}
	}

	async deleteAccount(accountId: string): Promise<boolean> {
		try {
			if (!accountId) {
				logger.exception(new UserManagementException("Account ID is required"));
				return false;
			}

			return await this.accountRepo.delete(accountId);
		} catch (error) {
			logger.exception(
				new UserManagementException(
					`Failed to delete account: ${
						error instanceof Error ? error.message : "Unknown error"
					}`,
				),
			);
			return false;
		}
	}

	async accountExists(accountId: string): Promise<boolean> {
		try {
			if (!accountId) {
				logger.exception(new UserManagementException("Account ID is required"));
				return false;
			}

			return await this.accountRepo.exists(accountId);
		} catch (error) {
			logger.exception(
				new UserManagementException(
					`Failed to check account existence: ${
						error instanceof Error ? error.message : "Unknown error"
					}`,
				),
			);
			return false;
		}
	}

	async getAccounts(
		limit: number = 50,
		offset: number = 0,
	): Promise<Account[]> {
		try {
			return await this.accountRepo.findMany(limit, offset);
		} catch (error) {
			logger.exception(
				new UserManagementException(
					`Failed to fetch accounts: ${
						error instanceof Error ? error.message : "Unknown error"
					}`,
				),
			);
			return [];
		}
	}

	async checkUserStatus(userId: string): Promise<AccountStatusType | null> {
		const account = await this.accountRepo.findFirstBy({ userId });
		if (!account) {
			logger.exception(
				new UserManagementException("Account not found for user"),
			);
			return null;
		}
		return account.status;
	}
}
