import { z } from "zod";

export const helpRequestInputSchema = z
	.object({
		// trim() evita cazurile in care clientul trimite doar spatii pentru campurile obligatorii.
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
	})
	// Pastram eventuale campuri suplimentare in payload, dar validam explicit campurile importante.
	.passthrough();

export type HelpRequestInput = z.infer<typeof helpRequestInputSchema>;
