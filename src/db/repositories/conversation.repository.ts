import { eq } from "drizzle-orm";
import { db } from "../";
import { repository } from "../../di/decorators/repository";
import { taskAssignments } from "../requests";
import { conversations } from "../social";
import type { DatabaseClient } from "./databaseClient";

export type Conversation = typeof conversations.$inferSelect;

@repository()
export class ConversationRepository {
	async create(
		taskAssignmentId: number,
		client: DatabaseClient = db,
	): Promise<Conversation> {
		const [conversation] = await client
			.insert(conversations)
			.values({
				taskAssignmentId,
				status: "OPEN",
			})
			.onConflictDoNothing({
				target: conversations.taskAssignmentId,
			})
			.returning();

		if (conversation) {
			return conversation;
		}

		const existing = await this.findByTaskAssignmentId(
			taskAssignmentId,
			client,
		);
		if (!existing) {
			throw new Error(
				`Conversation for task assignment ${taskAssignmentId} was not created`,
			);
		}

		return existing;
	}

	async findByTaskAssignmentId(
		taskAssignmentId: number,
		client: DatabaseClient = db,
	): Promise<Conversation | undefined> {
		const [conversation] = await client
			.select()
			.from(conversations)
			.where(eq(conversations.taskAssignmentId, taskAssignmentId))
			.limit(1);

		return conversation;
	}

	async findByHelpRequestId(
		helpRequestId: number,
		client: DatabaseClient = db,
	): Promise<Conversation | undefined> {
		const [conversation] = await client
			.select({
				id: conversations.id,
				taskAssignmentId: conversations.taskAssignmentId,
				status: conversations.status,
			})
			.from(conversations)
			.innerJoin(
				taskAssignments,
				eq(conversations.taskAssignmentId, taskAssignments.id),
			)
			.where(eq(taskAssignments.helpRequestId, helpRequestId))
			.limit(1);

		return conversation;
	}
}
