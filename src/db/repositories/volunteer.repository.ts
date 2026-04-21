import { eq, count as drizzleCount } from "drizzle-orm";
import { db } from "../../db";
import { volunteers, volunteerProfiles, profiles } from "../profile";
import { user } from "../auth-schema";
import { ratings } from "../social";

export type Volunteer = typeof volunteers.$inferSelect;
export type CreateVolunteerDTO = typeof volunteers.$inferInsert;
export type UpdateVolunteerDTO = Partial<CreateVolunteerDTO>;

export class VolunteerRepository {
	/**
	 * @param data Volunteer object (CreateVolunteerDTO)
	 * @returns created Volunteer
	 */
	async create(data: CreateVolunteerDTO): Promise<Volunteer> {
		const [newVolunteer] = await db.insert(volunteers).values(data).returning();
		return newVolunteer;
	}

	/**
	 * @param id id of Volunteer
	 * @returns first Volunteer that matches `id`
	 */
	async findById(id: number): Promise<Volunteer | undefined> {
		const [found] = await db
			.select()
			.from(volunteers)
			.where(eq(volunteers.id, id));
		return found;
	}

	/**
	 * @param userId userId of Volunteer
	 * @returns Volunteer that belongs to that user
	 */
	async findByUserId(userId: string): Promise<Volunteer | undefined> {
		const [found] = await db
			.select()
			.from(volunteers)
			.where(eq(volunteers.userId, userId));
		return found;
	}

	/**
	 * @param id id of Volunteer to be updated
	 * @param data partial Volunteer object
	 * @returns updated Volunteer
	 */
	async update(
		id: number,
		data: UpdateVolunteerDTO,
	): Promise<Volunteer | undefined> {
		const [updated] = await db
			.update(volunteers)
			.set(data)
			.where(eq(volunteers.id, id))
			.returning();
		return updated;
	}

	/**
	 * @param id id of Volunteer to be deleted
	 * @returns `true` if found and deleted, `false` otherwise
	 */
	async delete(id: number): Promise<boolean> {
		const result = await db
			.delete(volunteers)
			.where(eq(volunteers.id, id))
			.returning({ id: volunteers.id });
		return result.length > 0;
	}

	/**
	 * @param id id of Volunteer
	 * @returns `true` if Volunteer exists, `false` otherwise
	 */
	async exists(id: number): Promise<boolean> {
		const [{ value }] = await db
			.select({ value: drizzleCount() })
			.from(volunteers)
			.where(eq(volunteers.id, id));
		return value > 0;
	}

	/**
	 * Fetch full volunteer profile: volunteer + user + profile + volunteerProfile
	 * @param id id of Volunteer
	 * @returns aggregated profile data or `undefined` if not found
	 */
	async findProfileById(id: number) {
		const [result] = await db
			.select({
				volunteerId: volunteers.id,
				userId: volunteers.userId,
				availability: volunteers.availability,
				trustScore: volunteers.trustScore,
				completedTasks: volunteers.completedTasks,
				name: user.name,
				email: user.email,
				phone: user.phone,
				image: user.image,
				status: user.status,
				averageRating: user.averageRating,
				bio: profiles.bio,
				languages: profiles.languages,
				hiddenIdentity: profiles.hiddenIdentity,
				skills: volunteerProfiles.skills,
				maxDistanceKm: volunteerProfiles.maxDistanceKm,
			})
			.from(volunteers)
			.innerJoin(user, eq(volunteers.userId, user.id))
			.leftJoin(profiles, eq(profiles.userId, user.id))
			.leftJoin(
				volunteerProfiles,
				eq(volunteerProfiles.volunteerId, volunteers.id),
			)
			.where(eq(volunteers.id, id))
			.limit(1);

		return result;
	}

	/**
	 * Fetch all ratings received by a volunteer, plus calculated average
	 * @param id id of Volunteer
	 * @returns list of ratings and averageStars (null if no ratings)
	 */
	async findRatingsById(id: number): Promise<{
		ratings: {
			id: number;
			stars: number;
			comment: string | null;
			createdAt: Date;
			writtenByUserId: string;
		}[];
		averageStars: number | null;
	}> {
		const volunteer = await this.findById(id);
		if (!volunteer) return { ratings: [], averageStars: null };

		const allRatings = await db
			.select({
				id: ratings.id,
				stars: ratings.stars,
				comment: ratings.comment,
				createdAt: ratings.createdAt,
				writtenByUserId: ratings.writtenByUserId,
			})
			.from(ratings)
			.where(eq(ratings.receivedByUserId, volunteer.userId));

		if (allRatings.length === 0) return { ratings: [], averageStars: null };

		const averageStars =
			allRatings.reduce(
				(sum: number, r: { stars: number }) => sum + r.stars,
				0,
			) / allRatings.length;

		return {
			ratings: allRatings,
			averageStars: Math.round(averageStars * 100) / 100,
		};
	}

	async findMany(limit: number = 50, offset: number = 0): Promise<Volunteer[]> {
		return await db.select().from(volunteers).limit(limit).offset(offset);
	}

	async count(): Promise<number> {
		const [{ value }] = await db
			.select({ value: drizzleCount() })
			.from(volunteers);
		return value;
	}
}

/**
 * Singleton
 */
export const volunteerRepository = new VolunteerRepository();
