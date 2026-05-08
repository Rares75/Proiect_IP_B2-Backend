import { z } from "zod";
import {
	helpRequestCategoryEnum,
	requestStatusEnum,
	urgencyLevelEnum,
} from "../../db/enums";

const baseHelpRequestInputSchema = z
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
			.min(1, "Description is required")
			.optional(), // <-- Am pus optional aici!

		audioUrl: z.string().url({ message: "Must be a valid URL" }).optional(),

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

// 2. Schema principala (Baza + Refine)
export const helpRequestInputSchema = baseHelpRequestInputSchema.refine(
	(data) => data.description || data.audioUrl,
	{
		message: "You must provide either a description or an audioUrl",
		path: ["description"],
	},
);

export const helpRequestCreateInputSchema = helpRequestInputSchema;

export const HelpRequestSchema = helpRequestInputSchema;
export type HelpRequestInput = z.infer<typeof helpRequestInputSchema>;

// 3. Schema pentru Guest (Baza + Omit + Refine)
export const guestHelpRequestInputSchema = baseHelpRequestInputSchema
	.omit({
		anonymousMode: true,
		userId: true,
		category: true,
	})
	.extend({
		urgency: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
	})
	.strict()
	.refine((data) => data.description || data.audioUrl, {
		message: "You must provide either a description or an audioUrl",
		path: ["description"],
	});

export const guestTasksQuerySchema = z.object({
	page: z
		.string()
		.optional()
		.transform((v) => (v ? parseInt(v, 10) : 1))
		.pipe(z.number().int().min(1)),
	pageSize: z
		.string()
		.optional()
		.transform((v) => (v ? parseInt(v, 10) : 10))
		.pipe(z.number().int().min(1).max(50)),
	status: z.enum(requestStatusEnum.enumValues).optional(),
});
