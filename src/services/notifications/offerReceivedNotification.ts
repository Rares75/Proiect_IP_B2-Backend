import type { NotificationRepository } from "../../db/repositories/notification.repository";
import { buildOfferReceivedText } from "./templates";
import type {
	NotificationDbClient,
	OfferReceivedNotificationContext,
} from "./types";

export const notifyOwnerOfferReceived = async (
	notificationRepo: NotificationRepository,
	context: OfferReceivedNotificationContext,
	client?: NotificationDbClient,
): Promise<void> => {
	await notificationRepo.create(
		{
			userId: context.ownerUserId,
			type: "NEW_REQUEST",
			text: buildOfferReceivedText(context.title),
			relatedRequestId: context.helpRequestId,
		},
		client,
	);
};
