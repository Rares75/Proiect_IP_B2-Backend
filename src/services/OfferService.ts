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
			throw new ValidationError("Volunteer already created an offer for this task");
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

	async acceptOffer(offerId: number, userId: string): Promise<AcceptedOfferResult> {
		const context = await this.offerRepo.findNotificationContextById(offerId);

		if (!context) {
			throw new NotFoundError("Offer", String(offerId));
		}

		if (context.status !== "PENDING") {
			throw new InvalidStatusTransitionError(context.status, "ACCEPTED");
		}

		if (!context.requestedByUserId) {
			throw new ValidationError("Offer cannot be accepted without a task owner");
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
}
