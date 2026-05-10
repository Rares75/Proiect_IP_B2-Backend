import { describe, expect, it } from "bun:test";

import { messageInputSchema } from "../schemas/message.schema";

describe("messageInputSchema", () => {
	it("accepts a text message and defaults the type to TEXTCONTENT", () => {
		const result = messageInputSchema.parse({
			content: "Salut, ajung in 10 minute.",
		});

		expect(result).toEqual({
			type: "TEXTCONTENT",
			content: "Salut, ajung in 10 minute.",
		});
	});

	it("rejects a text message without content", () => {
		const result = messageInputSchema.safeParse({
			type: "TEXTCONTENT",
		});

		expect(result.success).toBe(false);
	});

	it("accepts an audio message with audioUrl and nullable content", () => {
		const result = messageInputSchema.parse({
			type: "AUDIOCONTENT",
			content: null,
			audioUrl: "https://cdn.example.com/messages/audio-1.webm",
		});

		expect(result).toEqual({
			type: "AUDIOCONTENT",
			content: null,
			audioUrl: "https://cdn.example.com/messages/audio-1.webm",
		});
	});

	it("rejects an audio message without audioUrl", () => {
		const result = messageInputSchema.safeParse({
			type: "AUDIOCONTENT",
			content: null,
		});

		expect(result.success).toBe(false);
	});
});
