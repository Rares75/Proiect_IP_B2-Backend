import { z } from "zod";
import { messageContentTypeEnum } from "../../db/enums";
import { optionalCoercedNumber } from "./queryParams.schema";

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

export const messagesQuerySchema = z.object({
	page: optionalCoercedNumber("Page must be a number")
		.refine((value) => value === undefined || value > 0, {
			message: "Page must be greater than 0",
		})
		.default(1),
	pageSize: optionalCoercedNumber("Page size must be a number")
		.refine((value) => value === undefined || value > 0, {
			message: "Page size must be greater than 0",
		})
		.refine((value) => value === undefined || value <= 100, {
			message: "Page size must be less than or equal to 100",
		})
		.default(20),
});

export const wsMessageSchema = z.object({
	type: z.literal("SEND_MESSAGE"),
	data: messageInputSchema,
});
