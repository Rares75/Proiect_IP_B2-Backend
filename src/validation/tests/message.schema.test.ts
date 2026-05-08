import { describe, expect, it } from "bun:test";
import { messageInputSchema } from "../schemas/message.schema";

describe("Message Schemas", () => {
	describe("messageInputSchema", () => {
		it("accepts a valid text message", () => {
			const result = messageInputSchema.parse({
				type: "TEXTCONTENT",
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

		it("rejects a text message with empty content", () => {
			const result = messageInputSchema.safeParse({
				type: "TEXTCONTENT",
				content: "",
			});

			expect(result.success).toBe(false);
		});

		it("accepts an audio message with a valid audioUrl", () => {
			const result = messageInputSchema.parse({
				type: "AUDIOCONTENT",
				audioUrl: "https://cdn.example.com/messages/audio-1.webm",
			});

			expect(result).toEqual({
				type: "AUDIOCONTENT",
				audioUrl: "https://cdn.example.com/messages/audio-1.webm",
			});
		});

		it("rejects an audio message without an audioUrl", () => {
			const result = messageInputSchema.safeParse({
				type: "AUDIOCONTENT",
			});

			expect(result.success).toBe(false);
		});

		it("rejects an audio message with an invalid URL", () => {
			const result = messageInputSchema.safeParse({
				type: "AUDIOCONTENT",
				audioUrl: "not-a-valid-url",
			});

			expect(result.success).toBe(false);
		});
	});
});
