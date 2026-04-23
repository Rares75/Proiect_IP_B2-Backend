import { helpOffers } from "../src/db/schema";
import type { EntitySeed } from "./types";
import { pick, seedDate } from "./helpers";

const statuses = ["PENDING", "ACCEPTED", "REJECTED"] as const;

export const helpOffersSeed: EntitySeed = {
	name: "helpOffers",
	run: async (db, context) => {
		context.helpOffers = await db
			.insert(helpOffers)
			.values(
				context.helpRequests.slice(0, 27).flatMap((request, index) => [
					{
						volunteerId: pick(context.volunteers, index).id,
						helpRequestId: request.id,
						message: `I can help with request ${request.id}.`,
						status: pick(statuses, index),
						createdAt: seedDate(index + 1, 14),
					},
					{
						volunteerId: pick(context.volunteers, index + 3).id,
						helpRequestId: request.id,
						message: `Backup offer for request ${request.id}.`,
						status: pick(statuses, index + 1),
						createdAt: seedDate(index + 1, 15),
					},
				]),
			)
			.returning();
	},
};
