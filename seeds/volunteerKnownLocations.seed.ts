import { volunteerKnownLocations } from "../src/db/schema";
import type { EntitySeed } from "./types";
import { point } from "./helpers";

const cities = ["Bucharest", "Cluj-Napoca", "Iasi", "Timisoara", "Brasov"];

export const volunteerKnownLocationsSeed: EntitySeed = {
	name: "volunteerKnownLocations",
	run: async (db, context) => {
		context.volunteerKnownLocations = await db
			.insert(volunteerKnownLocations)
			.values(
				context.volunteers.flatMap((volunteer, index) => [
					{
						volunteerId: volunteer.id,
						city: cities[index % cities.length],
						addressText: `Seed street ${index + 1}`,
						location: point(index + 20),
					},
					{
						volunteerId: volunteer.id,
						city: cities[(index + 1) % cities.length],
						addressText: `Backup seed street ${index + 1}`,
						location: point(index + 60),
					},
				]),
			)
			.returning();
	},
};
