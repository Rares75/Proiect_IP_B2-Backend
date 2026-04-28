import { and, eq } from "drizzle-orm";
import { db } from "../";
import { repository } from "../../di/decorators/repository";
import { helpOffers } from "../requests";

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
}
