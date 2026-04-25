import { and, eq } from "drizzle-orm";
import { db } from "../";
import { repository } from "../../di/decorators/repository";
import { helpOffers, helpRequests, taskAssignments } from "../requests";
import { volunteers } from "../profile";
import type { offerStatusEnum } from "../enums";
import type { DatabaseClient } from "./databaseClient";

export type HelpOffer = typeof helpOffers.$inferSelect;
export type CreateHelpOfferDTO = typeof helpOffers.$inferInsert;
export type TaskAssignment = typeof taskAssignments.$inferSelect;
export type OfferStatus = (typeof offerStatusEnum.enumValues)[number];

export type OfferNotificationContext = {
	offerId: number;
	helpRequestId: number;
	volunteerId: number;
	status: OfferStatus;
	requestTitle: string;
	requestedByUserId: string | null;
	volunteerUserId: string;
};

export type AcceptableOfferNotificationContext = OfferNotificationContext & {
	requestedByUserId: string;
};

export type AcceptedOfferResult = {
	offer: HelpOffer;
	taskAssignment: TaskAssignment;
};

@repository()
export class OfferRepository {
	async create(data: CreateHelpOfferDTO): Promise<HelpOffer> {
		const [offer] = await db.insert(helpOffers).values(data).returning();
		return offer;
	}

	async findByHelpRequestAndVolunteer(
		helpRequestId: number,
		volunteerId: number,
	): Promise<HelpOffer | undefined> {
		const [offer] = await db
			.select()
			.from(helpOffers)
			.where(
				and(
					eq(helpOffers.helpRequestId, helpRequestId),
					eq(helpOffers.volunteerId, volunteerId),
				),
			)
			.limit(1);

		return offer;
	}

	async findNotificationContextById(
		offerId: number,
	): Promise<OfferNotificationContext | undefined> {
		const [context] = await db
			.select({
				offerId: helpOffers.id,
				helpRequestId: helpOffers.helpRequestId,
				volunteerId: helpOffers.volunteerId,
				status: helpOffers.status,
				requestTitle: helpRequests.title,
				requestedByUserId: helpRequests.requestedByUserId,
				volunteerUserId: volunteers.userId,
			})
			.from(helpOffers)
			.innerJoin(helpRequests, eq(helpOffers.helpRequestId, helpRequests.id))
			.innerJoin(volunteers, eq(helpOffers.volunteerId, volunteers.id))
			.where(eq(helpOffers.id, offerId))
			.limit(1);

		return context;
	}

	async acceptOffer(
		context: AcceptableOfferNotificationContext,
		client: DatabaseClient = db,
	): Promise<AcceptedOfferResult> {
		const [offer] = await client
			.update(helpOffers)
			.set({ status: "ACCEPTED" })
			.where(
				and(
					eq(helpOffers.id, context.offerId),
					eq(helpOffers.status, "PENDING"),
				),
			)
			.returning();

		if (!offer) {
			throw new Error("Offer could not be accepted");
		}

		const [taskAssignment] = await client
			.insert(taskAssignments)
			.values({
				helpRequestId: context.helpRequestId,
				offerId: context.offerId,
				requestedByUserId: context.requestedByUserId,
				handledByVolunteerId: context.volunteerId,
			})
			.returning();

		await client
			.update(helpRequests)
			.set({ status: "MATCHED" })
			.where(eq(helpRequests.id, context.helpRequestId));

		return { offer, taskAssignment };
	}
}
