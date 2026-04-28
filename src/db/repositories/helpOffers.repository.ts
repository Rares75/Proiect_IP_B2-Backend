import { and, count as drizzleCount, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { repository } from "../../di/decorators/repository";
import type { IRepository } from "./base.repository";
import { helpOffers } from "../requests";
import { userProfiles, volunteers } from "../profile";
import { user } from "../auth-schema"; // Ajustează calea dacă este necesar

export type HelpOffer = typeof helpOffers.$inferSelect;
export type CreateHelpOfferDTO = typeof helpOffers.$inferInsert;
export type UpdateHelpOfferDTO = Partial<CreateHelpOfferDTO>;

@repository()
export class HelpOfferRepository
	implements
		IRepository<HelpOffer, CreateHelpOfferDTO, UpdateHelpOfferDTO, number>
{
	async create(data: CreateHelpOfferDTO): Promise<HelpOffer> {
		const [newHelpOffer] = await db.insert(helpOffers).values(data).returning();
		return newHelpOffer;
	}

	async findById(id: number): Promise<HelpOffer | undefined> {
		const [found] = await db
			.select()
			.from(helpOffers)
			.where(eq(helpOffers.id, id));
		return found;
	}

	async findMany(limit: number = 50, offset: number = 0): Promise<HelpOffer[]> {
		return await db.select().from(helpOffers).limit(limit).offset(offset);
	}

	async findFirstBy(
		criteria: Partial<HelpOffer>,
	): Promise<HelpOffer | undefined> {
		const conditions = [];

		for (const [key, value] of Object.entries(criteria)) {
			if (value !== undefined) {
				const column = helpOffers[key as keyof typeof helpOffers];
				conditions.push(eq(column as any, value));
			}
		}

		if (conditions.length === 0) return undefined;

		const [found] = await db
			.select()
			.from(helpOffers)
			.where(and(...conditions))
			.limit(1);

		return found;
	}

	async update(
		id: number,
		data: UpdateHelpOfferDTO,
	): Promise<HelpOffer | undefined> {
		const [updated] = await db
			.update(helpOffers)
			.set(data)
			.where(eq(helpOffers.id, id))
			.returning();
		return updated;
	}

	async delete(id: number): Promise<boolean> {
		const result = await db
			.delete(helpOffers)
			.where(eq(helpOffers.id, id))
			.returning({ id: helpOffers.id });
		return result.length > 0;
	}

	async exists(id: number): Promise<boolean> {
		const [{ value }] = await db
			.select({ value: drizzleCount() })
			.from(helpOffers)
			.where(eq(helpOffers.id, id));
		return value > 0;
	}

	async count(): Promise<number> {
		const [{ value }] = await db
			.select({ value: drizzleCount() })
			.from(helpOffers);
		return value;
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
