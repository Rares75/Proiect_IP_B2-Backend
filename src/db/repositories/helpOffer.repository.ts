import { and, count as drizzleCount, desc, eq } from "drizzle-orm";
import { db } from "../";
import { repository } from "../../di/decorators/repository";
import { helpOffers } from "../requests";
import { userProfiles, volunteers } from "../profile";
import { user } from "../auth-schema";

export type HelpOffer = typeof helpOffers.$inferSelect;
export type CreateHelpOfferDTO = typeof helpOffers.$inferInsert;

@repository()
export class HelpOfferRepository {
	async create(data: CreateHelpOfferDTO): Promise<HelpOffer> {
		const [created] = await db.insert(helpOffers).values(data).returning();
		return created;
	}

	async findPendingByHelpRequestAndVolunteer(
		helpRequestId: number,
		volunteerId: number,
	): Promise<HelpOffer | undefined> {
		const [found] = await db
			.select()
			.from(helpOffers)
			.where(
				and(
					eq(helpOffers.helpRequestId, helpRequestId),
					eq(helpOffers.volunteerId, volunteerId),
					eq(helpOffers.status, "PENDING"),
				),
			)
			.limit(1);

		return found;
	}

	async findByHelpRequestId(helpRequestId: number): Promise<HelpOffer[]> {
		return db
			.select()
			.from(helpOffers)
			.where(eq(helpOffers.helpRequestId, helpRequestId));
	}

	async findPaginatedOffersByTaskId(
		helpRequestId: number,
		page: number,
		pageSize: number,
		statusFilter?: "PENDING" | "ACCEPTED" | "REJECTED",
	) {
		const offset = (page - 1) * pageSize;

		const conditions = [eq(helpOffers.helpRequestId, helpRequestId)];
		if (statusFilter) {
			conditions.push(eq(helpOffers.status, statusFilter));
		}

		const whereClause = and(...conditions);

		const rows = await db
			.select({
				id: helpOffers.id,
				volunteerId: helpOffers.volunteerId,
				message: helpOffers.message,
				status: helpOffers.status,
				createdAt: helpOffers.createdAt,
				volunteerUserId: volunteers.userId,
				trustScore: volunteers.trustScore,
				bio: userProfiles.bio,
				name: user.name,
				hiddenIdentity: userProfiles.hiddenIdentity,
				username: user.username,
			})
			.from(helpOffers)
			.innerJoin(volunteers, eq(helpOffers.volunteerId, volunteers.id))
			.innerJoin(user, eq(volunteers.userId, user.id))
			.leftJoin(userProfiles, eq(userProfiles.userId, user.id))
			.where(whereClause)
			.orderBy(desc(helpOffers.createdAt))
			.limit(pageSize)
			.offset(offset);

		const [{ value: total }] = await db
			.select({ value: drizzleCount() })
			.from(helpOffers)
			.where(whereClause);

		return { data: rows, total };
	}
}
