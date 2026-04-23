import { verification } from "../src/db/schema";
import type { EntitySeed } from "./types";
import { futureSeedDate, seedDate } from "./helpers";

export const verificationSeed: EntitySeed = {
	name: "verification",
	run: async (db, context) => {
		context.verification = await db
			.insert(verification)
			.values(
				Array.from({ length: 12 }, (_, index) => ({
					id: `verification-${String(index + 1).padStart(3, "0")}`,
					identifier: `user${String(index + 1).padStart(3, "0")}@example.com`,
					value: `seed-verification-code-${String(index + 1).padStart(3, "0")}`,
					expiresAt: futureSeedDate(index + 1, 18),
					createdAt: seedDate(index + 1),
					updatedAt: seedDate(index + 1, 13),
				})),
			)
			.returning();
	},
};
