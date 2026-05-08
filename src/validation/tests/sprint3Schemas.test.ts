/// <reference types="bun-types" />

import { describe, expect, it } from "bun:test";
import {
	createRatingSchema,
	guestHelpRequestInputSchema,
	messageInputSchema,
	messagesQuerySchema,
	notificationsQuerySchema,
	queryParamsSchema,
	wsMessageSchema,
} from "..";

const validGuestTask = {
	title: "Need help",
	description: "I need help by message",
	status: "OPEN",
	location: { x: 44.42, y: 26.1 },
};

describe("Sprint 3 centralized validation schemas", () => {
	it("accepts category in task query params", () => {
		const result = queryParamsSchema.safeParse({
			category: "MESSAGES_ONLY",
		});

		expect(result.success).toBe(true);
	});

	it("rejects CRITICAL urgency for guest task input", () => {
		const result = guestHelpRequestInputSchema.safeParse({
			...validGuestTask,
			urgency: "CRITICAL",
		});

		expect(result.success).toBe(false);
	});

	it("rejects category in guest task input", () => {
		const result = guestHelpRequestInputSchema.safeParse({
			...validGuestTask,
			category: "FACE_TO_FACE",
		});

		expect(result.success).toBe(false);
	});

	it("accepts LOW, MEDIUM, and HIGH urgency for guest task input", () => {
		for (const urgency of ["LOW", "MEDIUM", "HIGH"] as const) {
			const result = guestHelpRequestInputSchema.safeParse({
				...validGuestTask,
				urgency,
			});

			expect(result.success).toBe(true);
		}
	});

	it("validates message discriminated union inputs", () => {
		expect(
			messageInputSchema.safeParse({
				type: "TEXTCONTENT",
				content: "Salut",
			}).success,
		).toBe(true);
		expect(
			messageInputSchema.safeParse({
				type: "AUDIOCONTENT",
				audioUrl: "https://example.com/audio.mp3",
			}).success,
		).toBe(true);
		expect(
			messageInputSchema.safeParse({
				type: "TEXTCONTENT",
				content: "",
			}).success,
		).toBe(false);
	});

	it("validates websocket message envelope", () => {
		const result = wsMessageSchema.safeParse({
			type: "SEND_MESSAGE",
			data: {
				type: "TEXTCONTENT",
				content: "Mesaj nou",
			},
		});

		expect(result.success).toBe(true);
	});

	it("applies message pagination defaults and max pageSize", () => {
		const defaults = messagesQuerySchema.parse({});
		expect(defaults).toEqual({ page: 1, pageSize: 20 });

		expect(
			messagesQuerySchema.safeParse({
				pageSize: "101",
			}).success,
		).toBe(false);
	});

	it("validates centralized rating input with optional comment", () => {
		expect(createRatingSchema.safeParse({ stars: 5 }).success).toBe(true);
		expect(
			createRatingSchema.safeParse({
				stars: 5,
				comment: "  ",
			}).success,
		).toBe(false);
	});

	it("parses notification query pagination and unreadOnly", () => {
		const parsed = notificationsQuerySchema.parse({
			page: "2",
			pageSize: "20",
			unreadOnly: "true",
		});

		expect(parsed).toEqual({
			page: 2,
			pageSize: 20,
			unreadOnly: true,
		});
		expect(notificationsQuerySchema.parse({})).toEqual({
			page: 1,
			pageSize: 20,
		});
		expect(
			notificationsQuerySchema.safeParse({
				pageSize: "51",
			}).success,
		).toBe(false);
	});
});
