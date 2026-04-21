import { z } from "zod";

import { requestDetailsSchema } from "./requestDetails.schema";

export const helpRequestInputSchema = z
	.object({
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
		urgency: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"], {
			error: "Urgency is required",
		}),
		status: z.enum(
			["OPEN", "MATCHED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "REJECTED"],
			{
				error: "Status is required",
			},
		),
		anonymousMode: z.boolean({
			error: "Anonymous mode is required",
		}),
		category: z
			.string({
				error: "Category is required",
			})
			.trim()
			.min(1, "Category is required"),
		requestDetails: requestDetailsSchema,
	})
	.strict();

export type HelpRequestInput = z.infer<typeof helpRequestInputSchema>;
