import { requestDetails } from "../src/db/schema";
import type { EntitySeed } from "./types";
import { pick } from "./helpers";

export const requestDetailsSeed: EntitySeed = {
	name: "requestDetails",
	run: async (db, context) => {
		context.requestDetails = await db
			.insert(requestDetails)
			.values(
				context.helpRequests.map((request, index) => ({
					helpRequestId: request.id,
					notes: `Detailed notes for request ${request.id}.`,
					languageNeeded: pick(["Romanian", "English", "French", null], index),
					safetyNotes: index % 4 === 0 ? "Call before arrival." : null,
				})),
			)
			.returning();
	},
};
