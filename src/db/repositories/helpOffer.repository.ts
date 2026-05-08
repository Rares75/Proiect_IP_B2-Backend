import { and, count as drizzleCount, desc, eq, sql } from "drizzle-orm";
import { db } from "../";
import { repository } from "../../di/decorators/repository";
import { helpOffers } from "../requests";
import { ratings } from "../social";
import { userProfiles, volunteers } from "../profile";
import { user } from "../auth-schema";
import type { DatabaseClient } from "./databaseClient";

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

		const conditions = [eq(helpOffers.helpRequestId, taskId)];
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
				name: user.name,
				hiddenIdentity: userProfiles.hiddenIdentity,
				username: user.username,
				averageRating: sql<string | null>`avg(${ratings.stars})`.as(
					"average_rating",
				),
			})
			.from(helpOffers)
			.innerJoin(volunteers, eq(helpOffers.volunteerId, volunteers.id))
			.innerJoin(user, eq(volunteers.userId, user.id))
			.leftJoin(userProfiles, eq(userProfiles.userId, user.id))
			.leftJoin(ratings, eq(ratings.receivedByUserId, volunteers.userId))
			.where(whereClause)
			.groupBy(
				helpOffers.id,
				helpOffers.volunteerId,
				helpOffers.message,
				helpOffers.status,
				helpOffers.createdAt,
				volunteers.userId,
				volunteers.trustScore,
				user.name,
				userProfiles.hiddenIdentity,
				user.username,
			)
			.orderBy(desc(helpOffers.createdAt))
			.limit(pageSize)
			.offset(offset);

		const [{ value: total }] = await db
			.select({ value: drizzleCount() })
			.from(helpOffers)
			.where(whereClause);

		return { data: rows, total };
	}

	/**
	 * Find all pending offers for a help request with volunteer user info
	 */
	async findPendingByHelpRequestId(
		helpRequestId: number,
	): Promise<
		Array<{ id: number; volunteerId: number; volunteerUserId: string }>
	> {
		return db
			.select({
				id: helpOffers.id,
				volunteerId: helpOffers.volunteerId,
				volunteerUserId: volunteers.userId,
			})
			.from(helpOffers)
			.innerJoin(volunteers, eq(helpOffers.volunteerId, volunteers.id))
			.where(
				and(
					eq(helpOffers.helpRequestId, helpRequestId),
					eq(helpOffers.status, "PENDING"),
				),
			);
	}

	/**
	 * Update all pending offers for a help request to a new status (e.g., REJECTED)
	 */
	async updatePendingOffersByHelpRequestId(
		helpRequestId: number,
		newStatus: "REJECTED" | "ACCEPTED",
		client: DatabaseClient = db,
	): Promise<number> {
		const result = await client
			.update(helpOffers)
			.set({ status: newStatus })
			.where(
				and(
					eq(helpOffers.helpRequestId, helpRequestId),
					eq(helpOffers.status, "PENDING"),
				),
			)
			.returning({ id: helpOffers.id });
		return result.length;
	}
}
