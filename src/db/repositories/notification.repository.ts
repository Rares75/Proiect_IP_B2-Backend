import { and, eq } from "drizzle-orm";
import { db } from "../";
import { repository } from "../../di/decorators/repository";
import { userAccesses, volunteers } from "../profile";
import { notifications } from "../social";

export type Notification = typeof notifications.$inferSelect;
export type CreateNotificationDTO = typeof notifications.$inferInsert;

export type NewRequestNotificationRecipient = {
	userId: string;
};

@repository()
export class NotificationRepository {
	async findEligibleNewRequestRecipients(): Promise<
		NewRequestNotificationRecipient[]
	> {
		// TODO: add skill matching using volunteer_profiles.skills and helpRequests.skillsNeeded
		// TODO: add distance matching using volunteer_known_locations, request_locations and ST_DWithin
		return db
			.select({
				userId: volunteers.userId,
			})
			.from(volunteers)
			.innerJoin(userAccesses, eq(userAccesses.userId, volunteers.userId))
			.where(
				and(
					eq(volunteers.availability, true),
					eq(userAccesses.status, "ACTIVE"),
				),
			);
	}

	async createMany(data: CreateNotificationDTO[]): Promise<Notification[]> {
		if (data.length === 0) {
			return [];
		}

		return db.insert(notifications).values(data).returning();
	}
}
