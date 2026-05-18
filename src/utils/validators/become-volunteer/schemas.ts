import { z } from "zod";

export const becomeVolunteerResponseSchema = z.object({
	message: z.string(),
	volunteerId: z.number().int().positive(),
});

export const becomeVolunteerErrorResponseSchema = z.object({
	data: z.null(),
	error: z.object({
		kind: z.string(),
		message: z.string().optional(),
	}),
});
