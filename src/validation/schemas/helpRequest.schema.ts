import { z } from "zod";
import {
	helpRequestCategoryEnum,
	requestStatusEnum,
	urgencyLevelEnum,
} from "../../db/enums";

export const helpRequestInputSchema = z
	.object({
		requestedByUserId: z.string().nullable().optional(),
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
		city: z.string().max(100).optional(),
		addressText: z.string().optional(),
		category: z.enum(helpRequestCategoryEnum.enumValues, {
			error: "Category is required",
		}),
		skillsNeeded: z.array(z.string().trim().min(1)).optional(),
		location: z
			.object({
				x: z.number(),
				y: z.number(),
			})
			.strict(),
	})
	.strict();

export const helpRequestCreateInputSchema = helpRequestInputSchema;

export const HelpRequestSchema = helpRequestInputSchema;
export type HelpRequestInput = z.infer<typeof helpRequestInputSchema>;
