import { taskAssignments } from "../src/db/schema";
import type { EntitySeed } from "./types";
import { pick, seedDate } from "./helpers";

const statuses = ["ASSIGNED", "STARTED", "COMPLETED", "CANCELLED"] as const;

export const taskAssignmentsSeed: EntitySeed = {
	name: "taskAssignments",
	run: async (db, context) => {
		context.taskAssignments = await db
			.insert(taskAssignments)
			.values(
				context.helpRequests.slice(0, 24).map((request, index) => {
					const volunteer = pick(context.volunteers, index + 2);
					const requestedByUserId =
						request.userId ?? pick(context.users, index).id;
					const status = pick(statuses, index);

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
