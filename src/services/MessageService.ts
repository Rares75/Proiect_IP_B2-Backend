import { inject } from "../di";
import { Service } from "../di/decorators/service";
import {
	MessageRepository,
	type PaginatedConversationMessage,
} from "../db/repositories/message.repository";

export type GetMessagesForTaskResult =
	| {
			status: 200;
			body: {
				data: PaginatedConversationMessage[];
				meta: {
					page: number;
					pageSize: number;
					total: number;
					totalPages: number;
				};
			};
	  }
	| {
			status: 403 | 404;
			message: string;
	  };

@Service()
export class MessageService {
	constructor(
		@inject(MessageRepository)
		private readonly messageRepository: MessageRepository,
	) {}

	async getMessagesForTask(
		helpRequestId: number,
		access:
			| { kind: "auth"; userId: string }
			| { kind: "guest"; guestSessionId: string },
		page: number,
		pageSize: number,
	): Promise<GetMessagesForTaskResult> {
		const context =
			await this.messageRepository.getConversationAccessContext(helpRequestId);

		if (!context?.taskAssignmentId || !context.conversationId) {
			return {
				status: 404,
				message: "Conversation not found",
			};
		}

		if (access.kind === "auth") {
			const isOwner = context.requestedByUserId === access.userId;
			const isAssignedVolunteer = context.handledByUserId === access.userId;

			if (!isOwner && !isAssignedVolunteer) {
				return {
					status: 403,
					message: "Forbidden",
				};
			}
		} else if (context.guestSessionId !== access.guestSessionId) {
			return {
				status: 403,
				message: "Forbidden",
			};
		}

		const [data, total] = await Promise.all([
			this.messageRepository.getMessagesByConversationId(
				context.conversationId,
				page,
				pageSize,
			),
			this.messageRepository.countMessagesByConversationId(
				context.conversationId,
			),
		]);

		return {
			status: 200,
			body: {
				data,
				meta: {
					page,
					pageSize,
					total,
					totalPages: Math.ceil(total / pageSize),
				},
			},
		};
	}
}
