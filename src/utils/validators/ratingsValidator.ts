import { z } from "zod";
import { createRatingSchema as baseCreateRatingSchema } from "../../validation/schemas/rating.schema";

export const createRatingSchema = baseCreateRatingSchema.extend({
	taskAssignmentId: z.number().int().positive(),
	writtenByUserId: z.string().min(1, "writtenByUserId is required"),
	receivedByUserId: z.string().min(1, "receivedByUserId is required"),
	comment: z.string().trim().min(1, "Comment is required"),
});

export type CreateRatingType = z.infer<typeof createRatingSchema>;
