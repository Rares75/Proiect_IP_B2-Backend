import { z } from "zod";

export const helpOfferInputSchema = z
	.object({
		message: z
			.string()
			.max(599, "Message must be at most 599 characters")
			.optional(),
	})
	.strict();

export type HelpOfferInput = z.infer<typeof helpOfferInputSchema>;
