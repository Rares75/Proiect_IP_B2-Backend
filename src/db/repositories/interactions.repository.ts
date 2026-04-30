import { db } from "../../db";
import { interactionHistories, ratings } from "../social";
import { eq, desc, count } from "drizzle-orm";
import { repository } from "../../di/decorators/repository";

@repository()
export class InteractionsRepository {
    async getInteractionsByUserId(userId: string, limit: number, offset: number) {
        return db
        .select()
        .from(interactionHistories)
        .where(eq(interactionHistories.userId, userId))
        .orderBy(desc(interactionHistories.date))
        .limit(limit)
        .offset(offset);
    }

    async countInteractionsByUserId(userId: string) {
        const result = await db
            .select({ count: count()})
            .from(interactionHistories)
            .where(eq(interactionHistories.userId, userId));
        return Number(result[0].count);
    }

    async getRatingsByTaskAssignmentId(taskAssignmentId: number) {
        return db
            .select()
            .from(ratings)
            .where(eq(ratings.taskAssignmentId, taskAssignmentId));
    }
}