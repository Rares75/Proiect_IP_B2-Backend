import { z } from "zod";
import { messageContentTypeEnum } from "../../db/enums";

export const textMessageInputSchema = z
	.object({
		type: z
			.literal(messageContentTypeEnum.enumValues[0])
			.default("TEXTCONTENT"),
		content: z.string({ error: "Content is required" }).trim().min(1, {
			message: "Content is required",
		}),
		audioUrl: z.string().url({ message: "Audio URL must be valid" }).optional(),
	})
	.strict();

export const audioMessageInputSchema = z
	.object({
		type: z.literal(messageContentTypeEnum.enumValues[1]),
		content: z.string().trim().optional().nullable(),
		audioUrl: z
			.string({ error: "Audio URL is required" })
			.trim()
			.min(1, { message: "Audio URL is required" })
			.url({ message: "Audio URL must be valid" }),
	})
	.strict();

export const messageInputSchema = z.union([
	textMessageInputSchema,
	audioMessageInputSchema,
]);

export type MessageInput = z.infer<typeof messageInputSchema>;
