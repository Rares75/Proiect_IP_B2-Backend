import { z } from "zod";

export const helpOfferCreateInputSchema = z
	.object({
		message: z
			.string()
			.max(500, "Message must be at most 500 characters")
			.optional(),
	})
	.strict();

export const HelpOfferCreateSchema = helpOfferCreateInputSchema;
export type HelpOfferCreateInput = z.infer<typeof helpOfferCreateInputSchema>;
