import { db } from "../db";
import { HelpRequestRepository } from "../db/repositories/helpRequest.repository";
import {
	type AcceptableOfferNotificationContext,
	OfferRepository,
	type AcceptedOfferResult,
	type HelpOffer,
} from "../db/repositories/offer.repository";
import { VolunteerRepository } from "../db/repositories/volunteer.repository";
import { inject } from "../di";
import { Service } from "../di/decorators/service";
import {
	ForbiddenError,
	InvalidStatusTransitionError,
	NotFoundError,
	ValidationError,
} from "../utils/Errors";
import { NotificationService } from "./NotificationService";

type CreateOfferInput = {
	message?: string | null;
};

@Service()
export class OfferService {
	constructor(
		@inject(OfferRepository)
		private readonly offerRepo: OfferRepository,
		@inject(HelpRequestRepository)
		private readonly helpRequestRepo: HelpRequestRepository,
		@inject(VolunteerRepository)
		private readonly volunteerRepo: VolunteerRepository,
		@inject(NotificationService)
		private readonly notificationService: NotificationService,
	) {}

	async createOfferForTask(
		helpRequestId: number,
		userId: string,
		input: CreateOfferInput,
	): Promise<HelpOffer> {
		const [helpRequest, volunteer] = await Promise.all([
			this.helpRequestRepo.findById(helpRequestId),
			this.volunteerRepo.findByUserId(userId),
		]);

		if (!helpRequest) {
			throw new NotFoundError("HelpRequest", String(helpRequestId));
		}

		if (!volunteer) {
			throw new ValidationError("User must be a volunteer to create an offer");
		}

		const existingOffer = await this.offerRepo.findByHelpRequestAndVolunteer(
			helpRequestId,
			volunteer.id,
		);
		if (existingOffer) {
			throw new ValidationError(
				"Volunteer already created an offer for this task",
			);
		}

		const offer = await this.offerRepo.create({
			helpRequestId,
			volunteerId: volunteer.id,
			message: input.message ?? null,
			status: "PENDING",
		});

		if (helpRequest.requestedByUserId) {
			try {
				await this.notificationService.notifyOwnerOfferReceived({
					helpRequestId: helpRequest.id,
					title: helpRequest.title,
					ownerUserId: helpRequest.requestedByUserId,
				});
			} catch (notificationError) {
				console.error(
					"Failed to notify task owner about received offer:",
					notificationError,
				);
			}
		}

		return offer;
	}

	async updateOfferStatus(
		offerId: number,
		userId: string,
		status: "ACCEPTED" | "REJECTED" | "PENDING",
	): Promise<HelpOffer> {
		const context = await this.offerRepo.findNotificationContextById(offerId);

		if (!context) {
			throw new NotFoundError("Offer", String(offerId));
		}

		if (context.taskStatus !== "OPEN") {
			throw new InvalidStatusTransitionError(context.taskStatus, status);
		}

		if (context.status !== "PENDING") {
			throw new InvalidStatusTransitionError(context.status, status);
		}

		if (status !== "ACCEPTED" && status !== "REJECTED") {
			throw new InvalidStatusTransitionError(context.status, status);
		}

		if (!context.requestedByUserId) {
			throw new ValidationError(
				"Offer cannot be accepted without a task owner",
			);
		}

		if (context.requestedByUserId !== userId) {
			throw new ForbiddenError("Only the task owner can accept this offer");
		}

		if (status === "REJECTED") {
			return db.transaction(async (tx) => {
				const taskOpen = await this.offerRepo.ensureTaskOpenForOfferTransition(
					context.helpRequestId,
					tx,
					"OPEN",
				);

				if (!taskOpen) {
					throw new InvalidStatusTransitionError(context.taskStatus, status);
				}

				const rejected = await this.offerRepo.updatePendingOfferStatus(
					context.offerId,
					"REJECTED",
					tx,
				);

				if (!rejected) {
					throw new InvalidStatusTransitionError(context.status, status);
				}

				return rejected;
			});
		}

		return db.transaction(async (tx) => {
			const accepted = await this.offerRepo.acceptOffer(
				context as AcceptableOfferNotificationContext,
				tx,
			);

			await this.notificationService.notifyVolunteerOfferAccepted(
				{
					helpRequestId: context.helpRequestId,
					taskAssignmentId: accepted.taskAssignment.id,
					title: context.requestTitle,
					volunteerUserId: context.volunteerUserId,
				},
				tx,
			);

			return accepted.offer;
		});
	}

	async acceptOffer(
		offerId: number,
		userId: string,
	): Promise<AcceptedOfferResult> {
		const context = await this.offerRepo.findNotificationContextById(offerId);

		if (!context) {
			throw new NotFoundError("Offer", String(offerId));
		}

		if (context.taskStatus !== "OPEN") {
			throw new InvalidStatusTransitionError(context.taskStatus, "ACCEPTED");
		}

		if (context.status !== "PENDING") {
			throw new InvalidStatusTransitionError(context.status, "ACCEPTED");
		}

		if (!context.requestedByUserId) {
			throw new ValidationError(
				"Offer cannot be accepted without a task owner",
			);
		}

		if (context.requestedByUserId !== userId) {
			throw new ForbiddenError("Only the task owner can accept this offer");
		}

		const acceptableContext: AcceptableOfferNotificationContext = {
			...context,
			requestedByUserId: context.requestedByUserId,
		};

		return db.transaction(async (tx) => {
			const accepted = await this.offerRepo.acceptOffer(acceptableContext, tx);

			await this.notificationService.notifyVolunteerOfferAccepted(
				{
					helpRequestId: context.helpRequestId,
					taskAssignmentId: accepted.taskAssignment.id,
					title: context.requestTitle,
					volunteerUserId: context.volunteerUserId,
				},
				tx,
			);

			return accepted;
		});
	}

	//BE1-26
	async deleteOffer(offerId: number, userId: string): Promise<void> {
		const offer = await this.offerRepo.findOfferWithVolunteerUserId(offerId);

		if (!offer) {
			throw new NotFoundError("Offer", String(offerId));
		}

		if (offer.volunteerUserId !== userId) {
			throw new ForbiddenError(
				"Only the volunteer who created the offer can withdraw it",
			);
		}

		if (offer.status !== "PENDING") {
			throw new ValidationError("Only PENDING offers can be withdrawn");
		}

		await this.offerRepo.delete(offerId);
	}
}
