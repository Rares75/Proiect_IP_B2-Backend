import { userAccesses } from "../src/db/schema";
import type { EntitySeed } from "./types";
import { seedDate } from "./helpers";

const accountStatuses = ["ACTIVE", "LIMITED", "BLOCKED"] as const;

export const userAccessesSeed: EntitySeed = {
	name: "userAccesses",
	run: async (db, context) => {
		context.userAccesses = await db
			.insert(userAccesses)
			.values(
				context.users.map((user, index) => {
					const blocked = index % 13 === 0;
					const limited = !blocked && index % 9 === 0;
					const status: (typeof accountStatuses)[number] = blocked
						? "BLOCKED"
						: limited
							? "LIMITED"
							: accountStatuses[0];

					return {
						userId: user.id,
						status,
						bannedReason: blocked ? "Repeated low ratings" : null,
						bannedAt: blocked ? seedDate(20 + index) : null,
						createdAt: seedDate(index + 1),
						updatedAt: seedDate(index + 1, 11),
					};
				}),
			)
			.returning();
	},
};
