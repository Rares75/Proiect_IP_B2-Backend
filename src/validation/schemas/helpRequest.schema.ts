import { z } from "zod";
import {
	requestStatusEnum,
	urgencyLevelEnum,
	helpRequestCategoryEnum,
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
		locationCity: z.string().max(100).optional(),
		locationAddressText: z.string().optional(),

		// MODIFICARE 1: Categoria este acum obligatorie si de tip enum
		category: z.enum(helpRequestCategoryEnum.enumValues, {
			error: "Category is required",
		}),

		// MODIFICARE 2: skillsNeeded adăugat ca array de string-uri validate
		skillsNeeded: z.array(z.string().trim().min(1)).optional(),

		// MODIFICARE 3: Am sters .optional() de la location. Acum e OBLIGATORIU!
		location: z
			.object({
				x: z.number(),
				y: z.number(),
			})
			.strict(),
	})
	.strict();

export const HelpRequestSchema = helpRequestInputSchema;
export type HelpRequestInput = z.infer<typeof helpRequestInputSchema>;
