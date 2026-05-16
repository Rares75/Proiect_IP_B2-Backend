import { inject } from "../di";
import { Service } from "../di/decorators/service";
import {
	MessageRepository,
	type ConversationAccessContext,
	type PaginatedConversationMessage,
} from "../db/repositories/message.repository";
import type { MessageInput } from "../validation";

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

export type ResolveRealtimeAccessResult =
	| {
			status: 200;
			context: ConversationAccessContext;
			role: "owner" | "volunteer";
			senderId: string | null;
			guestSessionId: string | null;
	  }
	| {
			status: 403 | 404;
			message: string;
	  };

export type CreateRealtimeMessageResult =
	| {
			status: 201;
			message: PaginatedConversationMessage;
			role: "owner" | "volunteer";
	  }
	| {
			status: 403 | 404 | 409;
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
		const accessResult = await this.resolveRealtimeAccess(
			helpRequestId,
			access,
		);
		if (accessResult.status !== 200) {
			return accessResult;
		}

		const [data, total] = await Promise.all([
			this.messageRepository.getMessagesByConversationId(
				accessResult.context.conversationId as number,
				page,
				pageSize,
			),
			this.messageRepository.countMessagesByConversationId(
				accessResult.context.conversationId as number,
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

	async resolveRealtimeAccess(
		helpRequestId: number,
		access:
			| { kind: "auth"; userId: string }
			| { kind: "guest"; guestSessionId: string },
	): Promise<ResolveRealtimeAccessResult> {
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

			return {
				status: 200,
				context,
				role: isOwner ? "owner" : "volunteer",
				senderId: access.userId,
				guestSessionId: null,
			};
		}

		if (context.guestSessionId !== access.guestSessionId) {
			return {
				status: 403,
				message: "Forbidden",
			};
		}

		return {
			status: 200,
			context,
			role: "owner",
			senderId: context.requestedByUserId,
			guestSessionId: access.guestSessionId,
		};
	}

	async createRealtimeMessage(
		helpRequestId: number,
		access:
			| { kind: "auth"; userId: string }
			| { kind: "guest"; guestSessionId: string },
		input: MessageInput,
	): Promise<CreateRealtimeMessageResult> {
		const accessResult = await this.resolveRealtimeAccess(
			helpRequestId,
			access,
		);
		if (accessResult.status !== 200) {
			return accessResult;
		}

		if (
			accessResult.context.helpRequestStatus !== "MATCHED" &&
			accessResult.context.helpRequestStatus !== "IN_PROGRESS"
		) {
			return {
				status: 409,
				message: "Task status must be MATCHED or IN_PROGRESS",
			};
		}

		const message = await this.messageRepository.createMessage({
			conversationId: accessResult.context.conversationId as number,
			senderId: accessResult.senderId,
			guestSessionId: accessResult.guestSessionId,
			type: input.type,
			content: input.content ?? null,
			audioUrl: input.audioUrl ?? null,
		});

		return {
			status: 201,
			message,
			role: accessResult.role,
		};
	}
}
