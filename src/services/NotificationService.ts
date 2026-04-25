import type { HelpRequest } from "../db/repositories/helpRequest.repository";
import { NotificationRepository } from "../db/repositories/notification.repository";
import { inject } from "../di";
import { Service } from "../di/decorators/service";

@Service()
export class NotificationService {
	constructor(
		@inject(NotificationRepository)
		private readonly notificationRepo: NotificationRepository,
	) {}

	async notifyEligibleVolunteersForNewRequest(
		helpRequest: Pick<HelpRequest, "id" | "title">,
	): Promise<void> {
		const recipients =
			await this.notificationRepo.findEligibleNewRequestRecipients();

		if (recipients.length === 0) {
			return;
		}

		await this.notificationRepo.createMany(
			recipients.map((recipient) => ({
				userId: recipient.userId,
				type: "NEW_REQUEST",
				text: `Un task nou in zona ta: ${helpRequest.title}`,
				relatedRequestId: helpRequest.id,
			})),
		);
	}
}
