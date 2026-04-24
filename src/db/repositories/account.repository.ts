import { eq, and, count as drizzleCount } from "drizzle-orm";

import { db } from "../../db";
import { repository } from "../../di/decorators/repository";
import { account } from "../auth-schema";
import type { IRepository } from "./base.repository";

export type Account = typeof account.$inferSelect;

/**
 * Data required to create a new Account.
 * @example
 * ```ts
 * const newAccountData: CreateAccountDTO = {
 *   id: "acc_123",
 *   accountId: "provider_user_123",
 *   providerId: "google",
 *   userId: "user_123",
 * };
 * const created = await accountRepository.create(newAccountData);
 * ```
 */
export type CreateAccountDTO = typeof account.$inferInsert;

/**
 * Data required to update an existing Account. All fields are optional.
 */
export type UpdateAccountDTO = Partial<CreateAccountDTO>;

@repository()
export class AccountRepository
	implements IRepository<Account, CreateAccountDTO, UpdateAccountDTO, string>
{
	/**
	 * @param data Account object (CreateAccountDTO)
	 * @returns created Account
	 */
	async create(data: CreateAccountDTO): Promise<Account> {
		const [newAccount] = await db.insert(account).values(data).returning();
		return newAccount;
	}

	/**
	 * @param id id of Account
	 * @returns first Account that matches `id`
	 */
	async findById(id: string): Promise<Account | undefined> {
		const [foundAccount] = await db
			.select()
			.from(account)
			.where(eq(account.id, id));
		return foundAccount;
	}

	/**
	 * @param id id of Account to be updated
	 * @param data partial Account object (only updates available fields)
	 * @returns updated Account
	 */
	async update(
		id: string,
		data: UpdateAccountDTO,
	): Promise<Account | undefined> {
		const [updatedAccount] = await db
			.update(account)
			.set({ ...data, updatedAt: new Date() })
			.where(eq(account.id, id))
			.returning();
		return updatedAccount;
	}

	/**
	 * @param id id of Account to be deleted
	 * @returns `true` if Account was found and deleted, `false` otherwise
	 */
	async delete(id: string): Promise<boolean> {
		const result = await db
			.delete(account)
			.where(eq(account.id, id))
			.returning({ id: account.id });
		return result.length > 0;
	}

	/**
	 * @param id id of Account
	 * @returns `true` if Account exists, `false` otherwise
	 */
	async exists(id: string): Promise<boolean> {
		const [{ value }] = await db
			.select({ value: drizzleCount() })
			.from(account)
			.where(eq(account.id, id));
		return value > 0;
	}

	/**
	 * Finds a single account that matches specific criteria.
	 * @param criteria object containing fields to search by
	 * @returns Account object if found, `undefined` if no match exists
	 */
	async findFirstBy(criteria: Partial<Account>): Promise<Account | undefined> {
		const conditions = [];

		for (const [key, value] of Object.entries(criteria)) {
			if (value !== undefined) {
				const column = account[key as keyof typeof account];
				conditions.push(eq(column as any, value));
			}
		}

		if (conditions.length === 0) {
			return undefined;
		}

		const [foundAccount] = await db
			.select()
			.from(account)
			.where(and(...conditions));
		return foundAccount;
	}

	/**
	 * @returns array of Accounts from the database using pagination
	 */
	async findMany(limit: number = 50, offset: number = 0): Promise<Account[]> {
		return await db.select().from(account).limit(limit).offset(offset);
	}

	/**
	 * @returns total number of Accounts
	 */
	async count(): Promise<number> {
		const [{ value }] = await db
			.select({ value: drizzleCount() })
			.from(account);
		return value;
	}
}
