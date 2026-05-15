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
	// 1. MAP-UL UNIFICAT PENTRU WEBSOCKETS (userId SAU guestSessionId -> socket)
	// Punem 'any' la socket momentan, depinde ce librarie WS folositi in controller
	public notificationSockets = new Map<string, any>();

	constructor(
		@inject(NotificationRepository)
		private readonly notificationRepo: NotificationRepository,
	) {}

	// 2. HELPER-UL PENTRU WEBSOCKET CERUT IN JIRA
	public pushIfConnected(key: string, notification: any) {
		const socket = this.notificationSockets.get(key);
		if (socket) {
			// Trimitem payload-ul exact in formatul cerut: { type: "NOTIFICATION", data: ... }
			socket.send(
				JSON.stringify({
					type: "NOTIFICATION",
					data: notification,
				}),
			);
		}
	}

	async notifyEligibleVolunteersForNewRequest(
		helpRequest: NewRequestNotificationContext,
	): Promise<void> {
		await notifyEligibleVolunteersForNewRequest(
			this.notificationRepo,
			helpRequest,
		);
	}

	async notifyOwnerOfferReceived(
		context: OfferReceivedNotificationContext & {
			guestSessionId?: string | null;
		},
		client?: NotificationDbClient,
	): Promise<void> {
		// Preluăm notificarea returnată de helper-ul pe care tocmai l-am modificat
		const notification = await notifyOwnerOfferReceived(
			this.notificationRepo,
			context,
			client,
		);

		// Căutăm cheia (cine e destinatarul: user autentificat sau guest?)
		const key = notification.userId || notification.guestSessionId;
		if (key) {
			// Dacă e online pe WebSocket, i-o împingem instant!
			this.pushIfConnected(key, notification);
		}
	}

	async notifyVolunteerOfferAccepted(
		context: OfferAcceptedNotificationContext,
		client?: NotificationDbClient,
	): Promise<void> {
		const notification = (await notifyVolunteerOfferAccepted(
			this.notificationRepo,
			context,
			client,
		)) as any;
		// Dacă helper-ul a fost updatat să returneze notificarea:
		if (notification?.userId) {
			this.pushIfConnected(notification.userId, notification);
		}
	}

	async notifyVolunteersPendingOffersCancelled(
		notifications: Array<{
			userId: string;
			type: "TASK_UPDATED";
			text: string;
			relatedRequestId: number;
			relatedAssignmentId: null;
			createdAt: Date;
		}>,
		client?: any,
	): Promise<void> {
		if (notifications.length === 0) {
			return;
		}

		const createdNotifications = await this.notificationRepo.createMany(
			notifications.map((notif) => ({
				userId: notif.userId,
				type: notif.type,
				text: notif.text,
				relatedRequestId: notif.relatedRequestId,
				relatedAssignmentId: notif.relatedAssignmentId,
				createdAt: notif.createdAt,
			})),
			client,
		);

		// Trimitem prin WS notificările (pentru toți voluntarii afectați)
		for (const notif of createdNotifications) {
			if (notif.userId) {
				this.pushIfConnected(notif.userId, notif);
			}
		}
	}
}
