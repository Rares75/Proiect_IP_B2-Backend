import { z } from "zod";

export const helpRequestSchema = z
	.object({
		name: z
			.string({
				error: "Name is required",
			})
			.trim()
			.min(1, "Name is required"),
		email: z
			.string({
				error: "Email is required",
			})
			.trim()
			.min(1, "Email is required")
			.email("Email must be valid"),
		message: z
			.string({
				error: "Message is required",
			})
			.trim()
			.min(1, "Message is required"),
		age: z
			.number({
				error: "Must be a number",
			})
			.int("Must be a number")
			.positive("Must be a positive number")
			.optional(),
	})
	.passthrough();

export type HelpRequest = z.infer<typeof helpRequestSchema>;
