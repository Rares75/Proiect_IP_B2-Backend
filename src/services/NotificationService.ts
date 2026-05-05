import { NotificationRepository } from "../db/repositories/notification.repository";
import { inject } from "../di";
import { Service } from "../di/decorators/service";
import {
	notifyEligibleVolunteersForNewRequest,
	notifyOwnerOfferReceived,
	notifyVolunteerOfferAccepted,
	type NewRequestNotificationContext,
	type NotificationDbClient,
	type OfferAcceptedNotificationContext,
	type OfferReceivedNotificationContext,
} from "./notifications";

@Service()
export class NotificationService {
	constructor(
		@inject(NotificationRepository)
		private readonly notificationRepo: NotificationRepository,
	) {}

	async notifyEligibleVolunteersForNewRequest(
		helpRequest: NewRequestNotificationContext,
	): Promise<void> {
		await notifyEligibleVolunteersForNewRequest(
			this.notificationRepo,
			helpRequest,
		);
	}

	async notifyOwnerOfferReceived(
		context: OfferReceivedNotificationContext,
		client?: NotificationDbClient,
	): Promise<void> {
		await notifyOwnerOfferReceived(this.notificationRepo, context, client);
	}

	async notifyVolunteerOfferAccepted(
		context: OfferAcceptedNotificationContext,
		client?: NotificationDbClient,
	): Promise<void> {
		await notifyVolunteerOfferAccepted(this.notificationRepo, context, client);
	}
}
