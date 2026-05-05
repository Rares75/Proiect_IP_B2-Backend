import { z } from "zod";

export const helpOfferInputSchema = z
	.object({
		message: z
			.string()
			.max(500, "Message must be at most 500 characters")
			.optional(),
	})
	.strict();

export type HelpOfferInput = z.infer<typeof helpOfferInputSchema>;
