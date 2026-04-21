import { notifications } from "../src/db/schema";
import type { EntitySeed } from "./types";
import { pick, seedDate } from "./helpers";

const types = [
	"NEW_REQUEST",
	"OFFER_ACCEPTED",
	"TASK_UPDATED",
	"TASK_COMPLETED",
	"WARNING",
] as const;

export const notificationsSeed: EntitySeed = {
	name: "notifications",
	run: async (db, context) => {
		context.notifications = await db
			.insert(notifications)
			.values(
				Array.from({ length: 60 }, (_, index) => ({
					userId: pick(context.users, index).id,
					type: pick(types, index),
					text: `Seed notification ${index + 1}`,
					createdAt: seedDate(index + 1, 22),
					readAt: index % 3 === 0 ? seedDate(index + 1, 23) : null,
				})),
			)
			.returning();
	},
};
