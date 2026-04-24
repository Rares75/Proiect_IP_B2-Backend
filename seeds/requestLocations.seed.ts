import { requestLocations } from "../src/db/schema";
import type { EntitySeed } from "./types";
import { pick, point } from "./helpers";

const cities = ["Bucharest", "Cluj-Napoca", "Iasi", "Timisoara", "Brasov"];

export const requestLocationsSeed: EntitySeed = {
	name: "requestLocations",
	run: async (db, context) => {
		context.requestLocations = await db
			.insert(requestLocations)
			.values(
				context.helpRequests.map((request, index) => ({
					helpRequestId: request.id,
					city: pick(cities, index),
					addressText: `Help request address ${index + 1}`,
					location: point(index + 100),
				})),
			)
			.returning();
	},
};
