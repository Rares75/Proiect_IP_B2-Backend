import { eq, and, desc, count as drizzleCount } from "drizzle-orm";
import { db } from "../../db";
import { repository } from "../../di/decorators/repository";
import { userProfiles, volunteerProfiles, volunteers } from "../profile";
import { user } from "../auth-schema";
import { ratings } from "../social";
import { helpOffers, helpRequests } from "../schema";

export type Volunteer = typeof volunteers.$inferSelect;
export type CreateVolunteerDTO = typeof volunteers.$inferInsert;
export type UpdateVolunteerDTO = Partial<CreateVolunteerDTO>;

export interface OfferWithTaskData {
	id: number;
	volunteerId: number;
	helpRequestId: number;
	message: string | null;
	status: "PENDING" | "ACCEPTED" | "REJECTED";
	createdAt: Date;
	task: {
		id: number;
		title: string;
		urgency: string;
		status: string;
		description: string | null;
	};
}

@repository()
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
				phone: user.phoneNumber,
				image: user.image,
				bio: userProfiles.bio,
				languages: userProfiles.languages,
				hiddenIdentity: userProfiles.hiddenIdentity,
				skills: volunteerProfiles.skills,
				maxDistanceKm: volunteerProfiles.maxDistanceKm,
			})
			.from(volunteers)
			.innerJoin(user, eq(volunteers.userId, user.id))
			.leftJoin(userProfiles, eq(userProfiles.userId, user.id))
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

	/**
	 * Fetch offers sent by a specific volunteer with associated task data
	 * @param volunteerId id of Volunteer
	 * @param options filters and pagination options
	 * @returns paginated list of offers with task details and total count
	 */
	async findOffersByVolunteer(
		volunteerId: number,
		options: {
			status?: "PENDING" | "ACCEPTED" | "REJECTED";
			page?: number;
			pageSize?: number;
		},
	): Promise<{
		offers: OfferWithTaskData[];
		totalCount: number;
	}> {
		const { status, page = 1, pageSize = 10 } = options;

		// Build where conditions
		const conditions = [eq(helpOffers.volunteerId, volunteerId)];
		if (status) {
			conditions.push(eq(helpOffers.status, status));
		}

		// Build offset for pagination
		const offset = (page - 1) * pageSize;

		// Get total count with filters
		const [{ value: totalCount }] = await db
			.select({ value: drizzleCount() })
			.from(helpOffers)
			.where(and(...conditions));

		// Fetch paginated offers with task details
		const offers = await db
			.select({
				id: helpOffers.id,
				volunteerId: helpOffers.volunteerId,
				helpRequestId: helpOffers.helpRequestId,
				message: helpOffers.message,
				status: helpOffers.status,
				createdAt: helpOffers.createdAt,
				taskId: helpRequests.id,
				taskTitle: helpRequests.title,
				taskUrgency: helpRequests.urgency,
				taskStatus: helpRequests.status,
				taskDescription: helpRequests.description,
			})
			.from(helpOffers)
			.innerJoin(helpRequests, eq(helpOffers.helpRequestId, helpRequests.id))
			.where(and(...conditions))
			.orderBy(desc(helpOffers.createdAt))
			.limit(pageSize)
			.offset(offset);

		// Transform response to match expected format
		const transformedOffers = offers.map((offer) => ({
			id: offer.id,
			volunteerId: offer.volunteerId,
			helpRequestId: offer.helpRequestId,
			message: offer.message,
			status: offer.status,
			createdAt: offer.createdAt,
			task: {
				id: offer.taskId,
				title: offer.taskTitle,
				urgency: offer.taskUrgency,
				status: offer.taskStatus,
				description: offer.taskDescription,
			},
		}));

		return {
			offers: transformedOffers,
			totalCount,
		};
	}
}
