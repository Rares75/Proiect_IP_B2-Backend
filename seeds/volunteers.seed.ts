import { volunteers } from "../src/db/schema";
import type { EntitySeed } from "./types";

export const volunteersSeed: EntitySeed = {
	name: "volunteers",
	run: async (db, context) => {
		context.volunteers = await db
			.insert(volunteers)
			.values(
				context.users.slice(0, 18).map((user, index) => ({
					userId: user.id,
					availability: index % 3 !== 0,
					trustScore: 70 + index,
					completedTasks: index * 2,
				})),
			)
			.returning();
	},
};
