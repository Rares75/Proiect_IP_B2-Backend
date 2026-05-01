import { z } from "zod";

export const createRatingSchema = z.object({
	taskAssignmentId: z.number().int().positive(),
	writtenByUserId: z.string().min(1, "writtenByUserId is required"),
	receivedByUserId: z.string().min(1, "receivedByUserId is required"),
	stars: z
		.number()
		.int()
		.min(1, "Stars must be at least 1")
		.max(5, "Stars must be at most 5"),
	comment: z.string().trim().min(1, "Comment is required"),
});

export type CreateRatingType = z.infer<typeof createRatingSchema>;
