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

	/**
	 * Send TASK_UPDATED notifications to multiple volunteers (bulk operation)
	 * Used when a task is deleted and all pending offers are rejected
	 */
	async notifyVolunteersPendingOffersCancelled(
		notifications: Array<{
			userId: string;
			type: "TASK_UPDATED";
			text: string;
			relatedRequestId: number;
			relatedAssignmentId: null;
			createdAt: Date;
		}>,
	): Promise<void> {
		if (notifications.length === 0) {
			return;
		}

		// Create bulk notifications in the database
		await this.notificationRepo.createMany(
			notifications.map((notif) => ({
				userId: notif.userId,
				type: notif.type,
				text: notif.text,
				relatedRequestId: notif.relatedRequestId,
				relatedAssignmentId: notif.relatedAssignmentId,
				createdAt: notif.createdAt,
			})),
		);
	}
}
