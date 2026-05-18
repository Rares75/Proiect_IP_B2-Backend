import { z } from "zod";

export const profileResponseSchema = z.object({
	userId: z.string(),
	bio: z.string().optional(),
	languages: z.array(z.string()).optional(),
	hiddenIdentity: z.boolean().optional(),
});

export const profileErrorResponseSchema = z.object({
	data: z.null(),
	error: z.object({
		kind: z.string(),
		message: z.string().optional(),
	}),
});

export const profileDeleteResponseSchema = z.object({
	deleted: z.boolean(),
});
