import { and, eq, avg, count, desc } from "drizzle-orm";
import { db } from "../../db";
import { repository } from "../../di/decorators/repository";
import {
	ratings,
	type RatingType,
	taskAssignments,
	volunteers,
} from "../schema";

export type RatingCreateData = {
	taskAssignmentId: number;
	writtenByUserId: string;
	receivedByUserId: string;
	stars: number;
	comment: string;
};

@repository()
export class RatingsRepository {
	async getRatingsByReceivedUserId(userId: string): Promise<RatingType[]> {
		return db
			.select()
			.from(ratings)
			.where(eq(ratings.receivedByUserId, userId));
	}

	async getTaskAssignmentById(taskAssignmentId: number) {
		return db
			.select()
			.from(taskAssignments)
			.where(eq(taskAssignments.id, taskAssignmentId));
	}

	async getVolunteerById(volunteerId: number) {
		return db.select().from(volunteers).where(eq(volunteers.id, volunteerId));
	}

	async findRating(
		taskAssignmentId: number,
		writtenByUserId: string,
		receivedByUserId: string,
	) {
		return db
			.select()
			.from(ratings)
			.where(
				and(
					eq(ratings.taskAssignmentId, taskAssignmentId),
					eq(ratings.writtenByUserId, writtenByUserId),
					eq(ratings.receivedByUserId, receivedByUserId),
				),
			);
	}

	async createRating(rating: RatingCreateData) {
		return db.insert(ratings).values(rating).returning();
	}

	async getRatingsSummaryByUserId(userId: string) {
		return db
			.select({
				averageRating: avg(ratings.stars),
				ratingsCount: count(),
			})
			.from(ratings)
			.where(eq(ratings.receivedByUserId, userId));
	}

	async getRecentRatingsByReceivedUserId(
		userId: string,
	): Promise<RatingType[]> {
		return db
			.select()
			.from(ratings)
			.where(eq(ratings.receivedByUserId, userId))
			.orderBy(desc(ratings.createdAt))
			.limit(5);
	}
}
