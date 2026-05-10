import type { NotificationRepository } from "../../db/repositories/notification.repository";
import { buildOfferAcceptedText } from "./templates";
import type {
	NotificationDbClient,
	OfferAcceptedNotificationContext,
} from "./types";

export const notifyVolunteerOfferAccepted = async (
	notificationRepo: NotificationRepository,
	context: OfferAcceptedNotificationContext,
	client?: NotificationDbClient,
): Promise<void> => {
	await notificationRepo.create(
		{
			userId: context.volunteerUserId,
			type: "OFFER_ACCEPTED",
			text: buildOfferAcceptedText(context.title),
			relatedRequestId: context.helpRequestId,
			relatedAssignmentId: context.taskAssignmentId,
		},
		client,
	);
};
