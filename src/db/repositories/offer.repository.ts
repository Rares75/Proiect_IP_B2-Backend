import { and, eq, sql } from "drizzle-orm";
import { db } from "../";
import { repository } from "../../di/decorators/repository";
import { helpOffers, helpRequests, taskAssignments } from "../requests";
import { volunteers } from "../profile";
import type { offerStatusEnum, requestStatusEnum } from "../enums";
import type { DatabaseClient } from "./databaseClient";
import { InvalidStatusTransitionError } from "../../utils/Errors";

export type HelpOffer = typeof helpOffers.$inferSelect;
export type CreateHelpOfferDTO = typeof helpOffers.$inferInsert;
export type TaskAssignment = typeof taskAssignments.$inferSelect;
export type OfferStatus = (typeof offerStatusEnum.enumValues)[number];

export type OfferNotificationContext = {
	offerId: number;
	helpRequestId: number;
	volunteerId: number;
	status: OfferStatus;
	taskStatus: (typeof requestStatusEnum.enumValues)[number];
	requestTitle: string;
	requestedByUserId: string | null;
	guestSessionId: string | null;
	volunteerUserId: string;
};

export type AcceptableOfferNotificationContext = OfferNotificationContext;

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
				taskStatus: helpRequests.status,
				requestTitle: helpRequests.title,
				requestedByUserId: helpRequests.requestedByUserId,
				guestSessionId: helpRequests.guestSessionId,
				volunteerUserId: volunteers.userId,
			})
			.from(helpOffers)
			.innerJoin(helpRequests, eq(helpOffers.helpRequestId, helpRequests.id))
			.innerJoin(volunteers, eq(helpOffers.volunteerId, volunteers.id))
			.where(eq(helpOffers.id, offerId))
			.limit(1);

		return context;
	}

	async ensureTaskOpenForOfferTransition(
		helpRequestId: number,
		client: DatabaseClient = db,
		newStatus: "OPEN" | "MATCHED",
	): Promise<boolean> {
		const [task] = await client
			.update(helpRequests)
			.set({ status: newStatus })
			.where(
				and(
					eq(helpRequests.id, helpRequestId),
					eq(helpRequests.status, "OPEN"),
				),
			)
			.returning({ id: helpRequests.id });

		return Boolean(task);
	}

	async updatePendingOfferStatus(
		offerId: number,
		status: "ACCEPTED" | "REJECTED",
		client: DatabaseClient = db,
	): Promise<HelpOffer | undefined> {
		const [offer] = await client
			.update(helpOffers)
			.set({ status })
			.where(and(eq(helpOffers.id, offerId), eq(helpOffers.status, "PENDING")))
			.returning();

		return offer;
	}

	async acceptOffer(
		context: AcceptableOfferNotificationContext,
		client: DatabaseClient = db,
	): Promise<AcceptedOfferResult> {
		const taskOpen = await this.ensureTaskOpenForOfferTransition(
			context.helpRequestId,
			client,
			"MATCHED",
		);

		if (!taskOpen) {
			throw new InvalidStatusTransitionError(context.taskStatus, "ACCEPTED");
		}

		const offer = await this.updatePendingOfferStatus(
			context.offerId,
			"ACCEPTED",
			client,
		);

		if (!offer) {
			throw new InvalidStatusTransitionError(context.status, "ACCEPTED");
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

		await client
			.update(helpOffers)
			.set({ status: "REJECTED" })
			.where(
				and(
					eq(helpOffers.helpRequestId, context.helpRequestId),
					eq(helpOffers.status, "PENDING"),
					sql`${helpOffers.id} <> ${context.offerId}`,
				),
			);

		return { offer, taskAssignment };
	}
}
