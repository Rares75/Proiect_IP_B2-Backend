import { conversations } from "../src/db/schema";
import type { EntitySeed } from "./types";

export const conversationsSeed: EntitySeed = {
	name: "conversations",
	run: async (db, context) => {
		context.conversations = await db
			.insert(conversations)
			.values(
				context.taskAssignments.map((assignment, index) => ({
					taskAssignmentId: assignment.id,
					status: index % 5 === 0 ? ("CLOSED" as const) : ("OPEN" as const),
				})),
			)
			.returning();
	},
};
