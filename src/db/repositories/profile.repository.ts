import { eq, and, count as drizzleCount } from "drizzle-orm";

import { db } from "../../db";
import { profiles } from "../profile";
import type { IRepository } from "./base.repository";

export type Profile = typeof profiles.$inferSelect;

export type CreateProfileDTO = typeof profiles.$inferInsert;

export type UpdateProfileDTO = Partial<CreateProfileDTO>;

export class ProfileRepository
	implements IRepository<Profile, CreateProfileDTO, UpdateProfileDTO, number>
{
	async create(data: CreateProfileDTO): Promise<Profile> {
		const [newProfile] = await db.insert(profiles).values(data).returning();
		return newProfile;
	}

	async update(
		id: number,
		data: UpdateProfileDTO,
	): Promise<Profile | undefined> {
		const [updatedProfile] = await db
			.update(profiles)
			.set(data)
			.where(eq(profiles.id, id))
			.returning();
		return updatedProfile;
	}

	async delete(id: number): Promise<boolean> {
		const result = await db
			.delete(profiles)
			.where(eq(profiles.id, id))
			.returning();
		return result.length > 0;
	}

	async exists(id: number): Promise<boolean> {
		const [{ value }] = await db
			.select({ value: drizzleCount() })
			.from(profiles)
			.where(eq(profiles.id, id));
		return value > 0;
	}

	async findById(id: number): Promise<Profile | undefined> {
		const [foundProfile] = await db
			.select()
			.from(profiles)
			.where(eq(profiles.id, id));
		return foundProfile;
	}

	async findFirstBy(criteria: Partial<Profile>): Promise<Profile | undefined> {
		const conditions = [];

		for (const [key, value] of Object.entries(criteria)) {
			if (value !== undefined) {
				const column = profiles[key as keyof typeof profiles];
				conditions.push(eq(column as any, value));
			}
		}

		if (conditions.length === 0) {
			return undefined;
		}

		const [foundProfile] = await db
			.select()
			.from(profiles)
			.where(and(...conditions))
			.limit(1);

		return foundProfile;
	}
	async findMany(limit: number = 50, offset: number = 0): Promise<Profile[]> {
		return await db.select().from(profiles).limit(limit).offset(offset);
	}

	async count(): Promise<number> {
		const [{ value }] = await db
			.select({ value: drizzleCount() })
			.from(profiles);
		return value;
	}
}

/**
 * Singleton
 */
export const profileRepository = new ProfileRepository();
