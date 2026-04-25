import type { NotificationRepository } from "../../db/repositories/notification.repository";
import { buildNewRequestText } from "./templates";
import type { NewRequestNotificationContext } from "./types";

export const notifyEligibleVolunteersForNewRequest = async (
	notificationRepo: NotificationRepository,
	helpRequest: NewRequestNotificationContext,
): Promise<void> => {
	const recipients =
		await notificationRepo.findEligibleNewRequestRecipients();

	if (recipients.length === 0) {
		return;
	}

	await notificationRepo.createMany(
		recipients.map((recipient) => ({
			userId: recipient.userId,
			type: "NEW_REQUEST",
			text: buildNewRequestText(helpRequest.title),
			relatedRequestId: helpRequest.id,
		})),
	);
};
