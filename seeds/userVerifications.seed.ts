import { volunteerVerifications } from "../src/db/schema";
import type { EntitySeed } from "./types";
import { seedDate } from "./helpers";

const statuses = ["PENDING", "VERIFIED", "REJECTED"] as const;

export const userVerificationsSeed: EntitySeed = {
	name: "userVerifications",
	run: async (db, context) => {
		context.userVerifications = await db
			.insert(volunteerVerifications)
			.values(
				context.volunteers.map((volunteer, index) => ({
					userId: volunteer.userId,
					status: statuses[index % statuses.length],
					submittedAt: seedDate(index + 1),
					verifiedAt: index % 3 === 1 ? seedDate(index + 2) : null,
				})),
			)
			.returning();
	},
};
