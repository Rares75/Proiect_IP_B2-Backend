import { eq, and, count as drizzleCount } from "drizzle-orm";

import { db } from "../../db";
import { repository } from "../../di/decorators/repository";
import { userProfiles } from "../profile";
import type { IRepository } from "./base.repository";

export type Profile = typeof userProfiles.$inferSelect;

export type CreateProfileDTO = typeof userProfiles.$inferInsert;

export type UpdateProfileDTO = Partial<CreateProfileDTO>;

@repository()
export class ProfileRepository
	implements IRepository<Profile, CreateProfileDTO, UpdateProfileDTO, number>
{
	async create(data: CreateProfileDTO): Promise<Profile> {
		const [newProfile] = await db.insert(userProfiles).values(data).returning();
		return newProfile;
	}

	async update(
		id: number,
		data: UpdateProfileDTO,
	): Promise<Profile | undefined> {
		const [updatedProfile] = await db
			.update(userProfiles)
			.set(data)
			.where(eq(userProfiles.id, id))
			.returning();
		return updatedProfile;
	}

	async delete(id: number): Promise<boolean> {
		const result = await db
			.delete(userProfiles)
			.where(eq(userProfiles.id, id))
			.returning();
		return result.length > 0;
	}

	async exists(id: number): Promise<boolean> {
		const [{ value }] = await db
			.select({ value: drizzleCount() })
			.from(userProfiles)
			.where(eq(userProfiles.id, id));
		return value > 0;
	}

	async findById(id: number): Promise<Profile | undefined> {
		const [foundProfile] = await db
			.select()
			.from(userProfiles)
			.where(eq(userProfiles.id, id));
		return foundProfile;
	}

	async findFirstBy(criteria: Partial<Profile>): Promise<Profile | undefined> {
		const conditions = [];

		for (const [key, value] of Object.entries(criteria)) {
			if (value !== undefined) {
				const column = userProfiles[key as keyof typeof userProfiles];
				conditions.push(eq(column as any, value));
			}
		}

		if (conditions.length === 0) {
			return undefined;
		}

		const [foundProfile] = await db
			.select()
			.from(userProfiles)
			.where(and(...conditions))
			.limit(1);

		return foundProfile;
	}
	async findMany(limit: number = 50, offset: number = 0): Promise<Profile[]> {
		return await db.select().from(userProfiles).limit(limit).offset(offset);
	}

	async count(): Promise<number> {
		const [{ value }] = await db
			.select({ value: drizzleCount() })
			.from(userProfiles);
		return value;
	}
}
