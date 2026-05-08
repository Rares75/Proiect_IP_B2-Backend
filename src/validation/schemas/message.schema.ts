import { z } from "zod";
import { optionalCoercedNumber } from "./queryParams.schema";

export const messageInputSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("TEXTCONTENT"),
		content: z.string().min(1),
	}),
	z.object({
		type: z.literal("AUDIOCONTENT"),
		audioUrl: z.string().url(),
	}),
]);

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
