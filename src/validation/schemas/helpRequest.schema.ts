import { z } from "zod";

import { requestStatusEnum, urgencyLevelEnum } from "../../db/enums";

export const helpRequestInputSchema = z
	.object({
		userId: z.unknown().optional(),
		requestedByUserId: z.unknown().optional(),
		guestSessionId: z.string().max(128).optional(),
		title: z
			.string({
				error: "Title is required",
			})
			.trim()
			.min(1, "Title is required"),
		description: z
			.string({
				error: "Description is required",
			})
			.trim()
			.min(1, "Description is required"),
		urgency: z.enum(urgencyLevelEnum.enumValues, {
			error: "Urgency is required",
		}),
		status: z.enum(requestStatusEnum.enumValues, {
			error: "Status is required",
		}),
		anonymousMode: z.boolean({
			error: "Anonymous mode is required",
		}),
		locationCity: z.string().max(100).optional(),
		locationAddressText: z.string().optional(),
		location: z
			.object({
				x: z.number(),
				y: z.number(),
			})
			.strict()
			.optional(),
	})
	.strict();

export const HelpRequestSchema = helpRequestInputSchema;
export type HelpRequestInput = z.infer<typeof helpRequestInputSchema>;
