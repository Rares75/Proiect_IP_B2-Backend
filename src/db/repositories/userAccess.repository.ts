import { and, count as drizzleCount, eq } from "drizzle-orm";
import { db } from "../../db";
import { repository } from "../../di/decorators/repository";
import { userAccesses } from "../profile";
import type { IRepository } from "./base.repository";

export type UserAccess = typeof userAccesses.$inferSelect;
export type CreateUserAccessDTO = typeof userAccesses.$inferInsert;
export type UpdateUserAccessDTO = Partial<CreateUserAccessDTO>;

@repository()
export class UserAccessRepository
	implements
		IRepository<UserAccess, CreateUserAccessDTO, UpdateUserAccessDTO, number>
{
	async create(data: CreateUserAccessDTO): Promise<UserAccess> {
		const [newUserAccess] = await db
			.insert(userAccesses)
			.values(data)
			.returning();
		return newUserAccess;
	}

	async findById(id: number): Promise<UserAccess | undefined> {
		const [found] = await db
			.select()
			.from(userAccesses)
			.where(eq(userAccesses.id, id));
		return found;
	}

	async update(
		id: number,
		data: UpdateUserAccessDTO,
	): Promise<UserAccess | undefined> {
		const [updated] = await db
			.update(userAccesses)
			.set(data)
			.where(eq(userAccesses.id, id))
			.returning();
		return updated;
	}

	async delete(id: number): Promise<boolean> {
		const result = await db
			.delete(userAccesses)
			.where(eq(userAccesses.id, id))
			.returning({ id: userAccesses.id });
		return result.length > 0;
	}

	async exists(id: number): Promise<boolean> {
		const [{ value }] = await db
			.select({ value: drizzleCount() })
			.from(userAccesses)
			.where(eq(userAccesses.id, id));
		return value > 0;
	}

	async findFirstBy(
		criteria: Partial<UserAccess>,
	): Promise<UserAccess | undefined> {
		const conditions = [];

		for (const [key, value] of Object.entries(criteria)) {
			if (value !== undefined) {
				const column = userAccesses[key as keyof typeof userAccesses];
				conditions.push(eq(column as any, value));
			}
		}

		if (conditions.length === 0) {
			return undefined;
		}

		const [found] = await db
			.select()
			.from(userAccesses)
			.where(and(...conditions))
			.limit(1);
		return found;
	}

	async findMany(
		limit: number = 50,
		offset: number = 0,
	): Promise<UserAccess[]> {
		return await db.select().from(userAccesses).limit(limit).offset(offset);
	}

	async count(): Promise<number> {
		const [{ value }] = await db
			.select({ value: drizzleCount() })
			.from(userAccesses);
		return value;
	}
}
