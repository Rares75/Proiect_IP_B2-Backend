import { db } from "../db";
import { interactionHistories, ratings } from "../db/social";
import { eq } from "drizzle-orm";

export class InteractionsRepository {
    static async getInteractionsByUserId(userId: string) {
        return db
        .select()
        .from(interactionHistories)
        .where(eq(interactionHistories.userId, userId));
    }

    static async getRatingsByTaskAssignmentId(taskAssignmentId: number) {
        return db
            .select()
            .from(ratings)
            .where(eq(ratings.taskAssignmentId, taskAssignmentId));
    }
}