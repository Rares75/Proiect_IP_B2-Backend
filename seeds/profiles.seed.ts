import { profiles } from "../src/db/schema";
import type { EntitySeed } from "./types";

const languages = [
	["ro", "en"],
	["ro"],
	["ro", "fr"],
	["ro", "en", "de"],
	["ro", "es"],
];

export const profilesSeed: EntitySeed = {
	name: "profiles",
	run: async (db, context) => {
		context.profiles = await db
			.insert(profiles)
			.values(
				context.users.map((user, index) => ({
					userId: user.id,
					bio: `${user.name} is part of the local support network.`,
					languages: languages[index % languages.length],
					hiddenIdentity: index % 7 === 0,
				})),
			)
			.returning();
	},
};
