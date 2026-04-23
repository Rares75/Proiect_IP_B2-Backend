import { messages } from "../src/db/schema";
import type { EntitySeed } from "./types";
import { pick, seedDate } from "./helpers";

export const messagesSeed: EntitySeed = {
	name: "messages",
	run: async (db, context) => {
		context.messages = await db
			.insert(messages)
			.values(
				context.conversations.flatMap((conversation, index) => {
					const assignment = context.taskAssignments.find(
						(item) => item.id === conversation.taskAssignmentId,
					);
					const volunteer = context.volunteers.find(
						(item) => item.id === assignment?.handledByVolunteerId,
					);
					const requesterId =
						assignment?.requestedByUserId ?? pick(context.users, index).id;
					const volunteerUserId =
						volunteer?.userId ?? pick(context.users, index + 1).id;

					return [
						{
							conversationId: conversation.id,
							senderId: requesterId,
							content: `Hello, I need help with request ${assignment?.helpRequestId}.`,
							sentAt: seedDate(index + 1, 9),
						},
						{
							conversationId: conversation.id,
							senderId: volunteerUserId,
							content: "I can help and will confirm the details.",
							sentAt: seedDate(index + 1, 10),
						},
						{
							conversationId: conversation.id,
							senderId: requesterId,
							content: "Thank you, that works for me.",
							sentAt: seedDate(index + 1, 11),
						},
					];
				}),
			)
			.returning();
	},
};
