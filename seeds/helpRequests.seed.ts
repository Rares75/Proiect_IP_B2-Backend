import { helpRequests } from "../src/db/schema";
import type { EntitySeed } from "./types";
import { pick, seedDate } from "./helpers";

const urgencies = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const statuses = [
	"OPEN",
	"MATCHED",
	"IN_PROGRESS",
	"COMPLETED",
	"CANCELLED",
] as const;
const titles = [
	"Grocery pickup",
	"Medication delivery",
	"Ride to clinic",
	"Translate documents",
	"Repair small fixture",
	"Check in call",
];

const skills = [
	"driving",
	"it",
	"web dev",
	"gardening",
	"cooking",
	"cleaning",
	"child care",
	"elder care",
	"pet care",
	"language translation",
];
const categories = ["FACE_TO_FACE", "MESSAGES_ONLY"] as const;

export const helpRequestsSeed: EntitySeed = {
	name: "helpRequests",
	run: async (db, context) => {
		context.helpRequests = await db
			.insert(helpRequests)
			.values(
				Array.from({ length: 36 }, (_, index) => {
					const anonymous = index % 10 === 0;
					const requester = pick(context.users, index);

					return {
						requestedByUserId: anonymous ? null : requester.id,
						guestSessionId: anonymous
							? `guest-session-${String(index + 1).padStart(3, "0")}`
							: null,
						skillsNeeded: [pick(skills, index)],
						category: pick(categories, index),
						title: `${pick(titles, index)} #${index + 1}`,
						description: `Seed request ${index + 1} for community support.`,
						urgency: pick(urgencies, index),
						status: pick(statuses, index),
						anonymousMode: anonymous,
						createdAt: seedDate(index + 1),
					};
				}),
			)
			.returning();
	},
};
