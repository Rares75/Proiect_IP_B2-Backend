import { taskAssignments } from "../src/db/schema";
import type { EntitySeed } from "./types";
import { pick, seedDate } from "./helpers";

const statuses = ["ASSIGNED", "STARTED", "COMPLETED", "CANCELLED"] as const;
// Keep these assignments completed but unrated so API clients can create ratings.
const rateableAssignmentCount = 20;

export const taskAssignmentsSeed: EntitySeed = {
	name: "taskAssignments",
	run: async (db, context) => {
		context.taskAssignments = await db
			.insert(taskAssignments)
			.values(
				context.helpRequests.map((request, index) => {
					const volunteer = pick(context.volunteers, index + 2);
					const requestedByUserId =
						request.requestedByUserId ?? pick(context.users, index).id;
					const status =
						index < rateableAssignmentCount
							? ("COMPLETED" as const)
							: pick(statuses, index);

					return {
						helpRequestId: request.id,
						requestedByUserId,
						handledByVolunteerId: volunteer.id,
						status,
						assignedAt: seedDate(index + 1, 16),
						completedAt:
							status === "COMPLETED" ? seedDate(index + 2, 17) : null,
					};
				}),
			)
			.returning();
	},
};
