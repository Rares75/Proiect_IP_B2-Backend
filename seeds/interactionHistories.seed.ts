import { interactionHistories } from "../src/db/schema";
import type { EntitySeed } from "./types";
import { pick, seedDate } from "./helpers";

export const interactionHistoriesSeed: EntitySeed = {
	name: "interactionHistories",
	run: async (db, context) => {
		context.interactionHistories = await db
			.insert(interactionHistories)
			.values(
				context.taskAssignments.flatMap((assignment, index) => {
					const volunteer = context.volunteers.find(
						(item) => item.id === assignment.handledByVolunteerId,
					);

					return [
						{
							userId: assignment.requestedByUserId,
							taskAssignmentId: assignment.id,
							date: seedDate(index + 1, 20),
							summary: `Requester interaction for assignment ${assignment.id}.`,
						},
						{
							userId: volunteer?.userId ?? pick(context.users, index).id,
							taskAssignmentId: assignment.id,
							date: seedDate(index + 1, 21),
							summary: `Volunteer interaction for assignment ${assignment.id}.`,
						},
					];
				}),
			)
			.returning();
	},
};
