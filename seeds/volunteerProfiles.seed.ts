import { volunteerProfiles } from "../src/db/schema";
import type { EntitySeed } from "./types";
import { point } from "./helpers";

const skills = [
	["shopping", "transport"],
	["translation", "paperwork"],
	["medicine pickup", "companionship"],
	["home repair", "delivery"],
	["childcare", "errands"],
];

export const volunteerProfilesSeed: EntitySeed = {
	name: "volunteerProfiles",
	run: async (db, context) => {
		context.volunteerProfiles = await db
			.insert(volunteerProfiles)
			.values(
				context.volunteers.map((volunteer, index) => ({
					volunteerId: volunteer.id,
					skills: skills[index % skills.length],
					maxDistanceKm: 3 + (index % 8),
					currentLocation: point(index),
				})),
			)
			.returning();
	},
};
