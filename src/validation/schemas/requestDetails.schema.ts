import { z } from "zod";

export const requestDetailsSchema = z.object({
	notes: z
		.string({
			error: "Notes is required",
		})
		.trim()
		.min(1, "Notes is required"),
	languageNeeded: z
		.string({
			error: "Language needed is required",
		})
		.trim()
		.min(1, "Language needed is required"),
	safetyNotes: z
		.string({
			error: "Safety notes is required",
		})
		.trim()
		.min(1, "Safety notes is required"),
});

export const RequestDetailsSchema = requestDetailsSchema;
export type RequestDetailsInput = z.infer<typeof requestDetailsSchema>;
