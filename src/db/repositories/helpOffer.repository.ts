import { and, count as drizzleCount, desc, eq } from "drizzle-orm";
import { db } from "../";
import { repository } from "../../di/decorators/repository";
import { helpOffers } from "../requests";
import { userProfiles, volunteers } from "../profile";
import { user } from "../auth-schema"; // Ajustează calea dacă este necesar

export type HelpOffer = typeof helpOffers.$inferSelect;
export type CreateHelpOfferDTO = typeof helpOffers.$inferInsert;

@repository()
export class HelpOfferRepository {
	async create(data: CreateHelpOfferDTO): Promise<HelpOffer> {
		const [created] = await db.insert(helpOffers).values(data).returning();
		return created;
	}

	async findPendingByHelpRequestIdAndVolunteerId(
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

	async findPaginatedOffersByTaskId(
		taskId: number,
		page: number,
		pageSize: number,
		statusFilter?: "PENDING" | "ACCEPTED" | "REJECTED",
	) {
		const offset = (page - 1) * pageSize;

		// 1. Construim filtrarea
		const conditions = [eq(helpOffers.helpRequestId, taskId)];
		if (statusFilter) {
			conditions.push(eq(helpOffers.status, statusFilter));
		}
		const whereClause = and(...conditions);

		// 2. Query pentru date cu JOIN-uri pentru profilul public
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

		// 3. Query separat pentru a calcula totalul necesar paginării
		const [{ value: total }] = await db
			.select({ value: drizzleCount() })
			.from(helpOffers)
			.where(whereClause);

		return { data: rows, total };
	}
}
