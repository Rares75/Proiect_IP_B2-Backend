import { asc, count, eq } from "drizzle-orm";
import { db } from "../../db";
import { repository } from "../../di/decorators/repository";
import { volunteers } from "../profile";
import { helpRequests, taskAssignments } from "../requests";
import { conversations, messages } from "../social";

export type ConversationAccessContext = {
	helpRequestId: number;
	helpRequestStatus: string;
	requestedByUserId: string | null;
	guestSessionId: string | null;
	taskAssignmentId: number | null;
	handledByUserId: string | null;
	conversationId: number | null;
};

export type PaginatedConversationMessage = {
	id: number;
	senderId: string | null;
	type: string;
	content: string | null;
	audioUrl: string | null;
	createdAt: Date;
};

export type CreateConversationMessageInput = {
	conversationId: number;
	senderId: string | null;
	guestSessionId: string | null;
	type: string;
	content: string | null;
	audioUrl: string | null;
};

@repository()
export class MessageRepository {
	async getConversationAccessContext(
		helpRequestId: number,
	): Promise<ConversationAccessContext | null> {
		const rows = await db
			.select({
				helpRequestId: helpRequests.id,
				helpRequestStatus: helpRequests.status,
				requestedByUserId: helpRequests.requestedByUserId,
				guestSessionId: helpRequests.guestSessionId,
				taskAssignmentId: taskAssignments.id,
				handledByUserId: volunteers.userId,
				conversationId: conversations.id,
			})
			.from(helpRequests)
			.leftJoin(
				taskAssignments,
				eq(taskAssignments.helpRequestId, helpRequests.id),
			)
			.leftJoin(
				volunteers,
				eq(volunteers.id, taskAssignments.handledByVolunteerId),
			)
			.leftJoin(
				conversations,
				eq(conversations.taskAssignmentId, taskAssignments.id),
			)
			.where(eq(helpRequests.id, helpRequestId))
			.limit(1);

		return rows[0] ?? null;
	}

	async createMessage(
		input: CreateConversationMessageInput,
	): Promise<PaginatedConversationMessage> {
		const [created] = await db
			.insert(messages)
			.values({
				conversationId: input.conversationId,
				senderId: input.senderId,
				guestSessionId: input.guestSessionId,
				type: input.type as any,
				content: input.content,
				audioUrl: input.audioUrl,
			})
			.returning({
				id: messages.id,
				senderId: messages.senderId,
				type: messages.type,
				content: messages.content,
				audioUrl: messages.audioUrl,
				createdAt: messages.sentAt,
			});

		return created;
	}

	async getMessagesByConversationId(
		conversationId: number,
		page: number,
		pageSize: number,
	): Promise<PaginatedConversationMessage[]> {
		const offset = (page - 1) * pageSize;

		return db
			.select({
				id: messages.id,
				senderId: messages.senderId,
				type: messages.type,
				content: messages.content,
				audioUrl: messages.audioUrl,
				createdAt: messages.sentAt,
			})
			.from(messages)
			.where(eq(messages.conversationId, conversationId))
			.orderBy(asc(messages.sentAt), asc(messages.id))
			.limit(pageSize)
			.offset(offset);
	}

	async countMessagesByConversationId(conversationId: number): Promise<number> {
		const rows = await db
			.select({ total: count() })
			.from(messages)
			.where(eq(messages.conversationId, conversationId));

		return Number(rows[0]?.total ?? 0);
	}
}
