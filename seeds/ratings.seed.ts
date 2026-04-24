import { ratings } from "../src/db/schema";
import type { EntitySeed } from "./types";
import { pick, seedDate } from "./helpers";

export const ratingsSeed: EntitySeed = {
	name: "ratings",
	run: async (db, context) => {
		context.ratings = await db
			.insert(ratings)
			.values(
				context.taskAssignments.flatMap((assignment, index) => {
					const volunteer = context.volunteers.find(
						(item) => item.id === assignment.handledByVolunteerId,
					);
					const volunteerUserId =
						volunteer?.userId ?? pick(context.users, index).id;
					const requesterId = assignment.requestedByUserId;

					return [
						{
							taskAssignmentId: assignment.id,
							writtenByUserId: requesterId,
							receivedByUserId: volunteerUserId,
							stars: 3 + (index % 3),
							comment: `Requester rating for assignment ${assignment.id}.`,
							createdAt: seedDate(index + 2, 18),
						},
						{
							taskAssignmentId: assignment.id,
							writtenByUserId: volunteerUserId,
							receivedByUserId: requesterId,
							stars: 4 + (index % 2),
							comment: `Volunteer rating for assignment ${assignment.id}.`,
							createdAt: seedDate(index + 2, 19),
						},
					];
				}),
			)
			.returning();
	},
};
