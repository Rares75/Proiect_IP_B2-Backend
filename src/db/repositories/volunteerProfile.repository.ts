import { eq, and, count as drizzleCount } from "drizzle-orm";
import { db } from "../../db";
import { repository } from "../../di/decorators/repository";
import { volunteerProfiles } from "../profile";
import type { IRepository } from "./base.repository";

export type VolunteerProfile = typeof volunteerProfiles.$inferSelect;
export type CreateVolunteerProfileDTO = typeof volunteerProfiles.$inferInsert;
export type UpdateVolunteerProfileDTO = Partial<CreateVolunteerProfileDTO>;

@repository()
export class VolunteerProfileRepository
	implements
		IRepository<
			VolunteerProfile,
			CreateVolunteerProfileDTO,
			UpdateVolunteerProfileDTO,
			number
		>
{
	async create(data: CreateVolunteerProfileDTO): Promise<VolunteerProfile> {
		const [created] = await db
			.insert(volunteerProfiles)
			.values(data)
			.returning();
		return created;
	}

	async update(
		id: number,
		data: UpdateVolunteerProfileDTO,
	): Promise<VolunteerProfile | undefined> {
		const [updated] = await db
			.update(volunteerProfiles)
			.set(data)
			.where(eq(volunteerProfiles.id, id))
			.returning();
		return updated;
	}

	async delete(id: number): Promise<boolean> {
		const result = await db
			.delete(volunteerProfiles)
			.where(eq(volunteerProfiles.id, id))
			.returning();
		return result.length > 0;
	}

	async exists(id: number): Promise<boolean> {
		const [{ value }] = await db
			.select({ value: drizzleCount() })
			.from(volunteerProfiles)
			.where(eq(volunteerProfiles.id, id));
		return value > 0;
	}

	async findById(id: number): Promise<VolunteerProfile | undefined> {
		const [found] = await db
			.select()
			.from(volunteerProfiles)
			.where(eq(volunteerProfiles.id, id));
		return found;
	}

	async findFirstBy(
		criteria: Partial<VolunteerProfile>,
	): Promise<VolunteerProfile | undefined> {
		const conditions = [];
		for (const [key, value] of Object.entries(criteria)) {
			if (value !== undefined) {
				const column = volunteerProfiles[key as keyof typeof volunteerProfiles];
				conditions.push(eq(column as any, value));
			}
		}
		if (conditions.length === 0) return undefined;

		const [found] = await db
			.select()
			.from(volunteerProfiles)
			.where(and(...conditions))
			.limit(1);
		return found;
	}

	async findMany(
		limit: number = 50,
		offset: number = 0,
	): Promise<VolunteerProfile[]> {
		return await db
			.select()
			.from(volunteerProfiles)
			.limit(limit)
			.offset(offset);
	}

	async count(): Promise<number> {
		const [{ value }] = await db
			.select({ value: drizzleCount() })
			.from(volunteerProfiles);
		return value;
	}

	async findByVolunteerId(
		volunteerId: number,
	): Promise<VolunteerProfile | undefined> {
		const [found] = await db
			.select()
			.from(volunteerProfiles)
			.where(eq(volunteerProfiles.volunteerId, volunteerId));
		return found;
	}
}
