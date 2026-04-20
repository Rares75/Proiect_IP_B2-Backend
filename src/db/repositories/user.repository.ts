import { eq, and, count as drizzleCount } from "drizzle-orm";

import { db } from "../../db";
import { user } from "../auth-schema";
import type { IRepository } from "./base.repository";

export type User = typeof user.$inferSelect;

/**
 * Data required to create a new User.
 * @example
 * ```ts
 * const newUserData: createUserDTO = {
 *  name: "Example"
 *  email: "example@gmail.com",
 *  // id, createdAt, etc. are created automatically by drizzle
 * };
 * const user = await userRepository.create(newUserData);
 * ```
 */
export type CreateUserDTO = typeof user.$inferInsert;

/**
 * Data required to update an existing User. All fields are optional (`Partial<User>`).
 * @example
 * ```ts
 * const updateData: UpdateUserDTO = { phone: "0744123456" };
 * await userRepository.update("user_id_here", updateData);
 * ```
 */
export type UpdateUserDTO = Partial<CreateUserDTO>;

export class UserRepository
	implements IRepository<User, CreateUserDTO, UpdateUserDTO, string>
{
	/**
	 * @param data User object (CreateUserDTO)
	 * @returns created User
	 */
	async create(data: CreateUserDTO): Promise<User> {
		// returning() tells postgres to return the row it created
		const [newUser] = await db.insert(user).values(data).returning();
		return newUser;
	}

	/**
	 * @param id id of User
	 * @returns first User that matches `id`
	 */
	async findById(id: string): Promise<User | undefined> {
		const [foundUser] = await db.select().from(user).where(eq(user.id, id));
		return foundUser;
	}

	/**
	 * @param id id of User to be updated
	 * @param data partial User object (only updates available fields)
	 * @returns updated User
	 */
	async update(id: string, data: UpdateUserDTO): Promise<User | undefined> {
		const [updatedUser] = await db
			.update(user)
			.set({ ...data, updatedAt: new Date() })
			.where(eq(user.id, id))
			.returning();
		return updatedUser;
	}

	/**
	 * @param id id of User to be deleted
	 * @returns `true` if User was found and deleted, `false` otherwise
	 */
	async delete(id: string): Promise<boolean> {
		const result = await db
			.delete(user)
			.where(eq(user.id, id))
			.returning({ id: user.id });
		return result.length > 0;
	}

	/**
	 * @param id id of User
	 * @returns `true` if User exists, `false` otherwise
	 */
	async exists(id: string): Promise<boolean> {
		const [{ value }] = await db
			.select({ value: drizzleCount() })
			.from(user)
			.where(eq(user.id, id));
		return value > 0;
	}

	/**
	 * Finds a single user that matches specific criteria (given as database columns).
	 * @param criteria object containing fields to search by
	 * @returns User object if found, `undefined` if no match exists
	 * @example
	 * ```ts
	 * // check for email
	 * const existingUser = await userRepository.findFirstBy({ email: "test@test.com" });
	 * if (existingUser) throw new Error("email taken!");
	 * ```
	 */
	async findFirstBy(criteria: Partial<User>): Promise<User | undefined> {
		const conditions = [];

		for (const [key, value] of Object.entries(criteria)) {
			if (value !== undefined) {
				const column = user[key as keyof typeof user];
				conditions.push(eq(column as any, value));
			}
		}

		if (conditions.length === 0) {
			return undefined;
		}

		const [foundUser] = await db
			.select()
			.from(user)
			.where(and(...conditions))
			.limit(1);

		return foundUser;
	}

	async findMany(limit: number = 50, offset: number = 0) {
		return await db.select().from(user).limit(limit).offset(offset);
	}

	async count(): Promise<number> {
		const [{ value }] = await db.select({ value: drizzleCount() }).from(user);
		return value;
	}
}

/**
 * Singleton
 */
export const userRepository = new UserRepository();
