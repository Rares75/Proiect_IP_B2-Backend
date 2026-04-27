import { describe, expect, it } from "bun:test";
import { Hono } from "hono";

import type { ValidationErrorResponse } from "../types/validation.types";
import {
	createValidationMiddleware,
	helpRequestInputSchema,
	requestDetailsSchema,
	validationMiddleware,
} from "..";

type HelpSuccessPayload = {
	title: string;
	description: string;
	urgency: string;
	status: string;
	anonymousMode: boolean;
	category: string;
};

type RequestDetailsSuccessPayload = {
	notes: string;
	languageNeeded: string;
	safetyNotes: string;
};

const validHelpRequestPayload: HelpSuccessPayload = {
	title: "Need transport support",
	description: "I need a ride to the clinic tomorrow morning.",
	urgency: "HIGH",
	status: "OPEN",
	anonymousMode: false,
	category: "Transport",
};

const validRequestDetailsPayload: RequestDetailsSuccessPayload = {
	notes: "Pickup at the main entrance.",
	languageNeeded: "Romanian",
	safetyNotes: "Wheelchair assistance needed.",
};

const createApp = (): Hono => {
	const app = new Hono().basePath("/api");

	app
		.use("/help", validationMiddleware)
		.use(
			"/help/helpRequest",
			createValidationMiddleware(helpRequestInputSchema),
		)
		.use(
			"/help/requestDetails",
			createValidationMiddleware(requestDetailsSchema),
		)
		.post("/help", async (c) => c.json(await c.req.json()))
		.post("/help/helpRequest", async (c) => c.json(await c.req.json()))
		.post("/help/requestDetails", async (c) => c.json(await c.req.json()));

	return app;
};

describe("Help route validation integration", () => {
	it("returns 400 with descriptive errors for a null helpRequest body", async () => {
		const app = createApp();

		const response = await app.request(
			"http://localhost/api/help/helpRequest",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: "null",
			},
		);

		const payload = (await response.json()) as ValidationErrorResponse &
			Record<string, unknown>;

		expect(response.status).toBe(400);
		expect(payload).toEqual({
			errors: [
				{
					field: "body",
					message: "Request body is required",
				},
			],
		});
		expect(payload.stack).toBeUndefined();
		expect(payload.message).toBeUndefined();
	});

	it("returns 400 and collects all missing required helpRequest fields", async () => {
		const app = createApp();

		const response = await app.request(
			"http://localhost/api/help/helpRequest",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					title: "",
					description: "",
				}),
			},
		);

		const payload = (await response.json()) as ValidationErrorResponse &
			Record<string, unknown>;

		expect(response.status).toBe(400);
		expect(payload.errors).toEqual([
			{
				field: "title",
				message: "Title is required",
			},
			{
				field: "description",
				message: "Description is required",
			},
			{
				field: "urgency",
				message: "Urgency is required",
			},
			{
				field: "status",
				message: "Status is required",
			},
			{
				field: "anonymousMode",
				message: "Anonymous mode is required",
			},
			{
				field: "category",
				message: "Category is required",
			},
		]);
	});

	it("passes /help/helpRequest without requestDetails", async () => {
		const app = createApp();

		const response = await app.request(
			"http://localhost/api/help/helpRequest",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(validHelpRequestPayload),
			},
		);

		const payload = (await response.json()) as HelpSuccessPayload &
			Record<string, unknown>;

		expect(response.status).toBe(200);
		expect(payload).toEqual(validHelpRequestPayload);
		expect(payload.body).toBeUndefined();
		expect(payload.ok).toBeUndefined();
	});

	it("requires requestDetails fields on /help/requestDetails", async () => {
		const app = createApp();

		const response = await app.request(
			"http://localhost/api/help/requestDetails",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					notes: "   ",
					languageNeeded: "",
					safetyNotes: "   ",
				}),
			},
		);

		const payload = (await response.json()) as ValidationErrorResponse &
			Record<string, unknown>;

		expect(response.status).toBe(400);
		expect(payload.errors).toEqual([
			{
				field: "notes",
				message: "Notes is required",
			},
			{
				field: "languageNeeded",
				message: "Language needed is required",
			},
			{
				field: "safetyNotes",
				message: "Safety notes is required",
			},
		]);
	});

	it("passes a valid requestDetails body on /help/requestDetails", async () => {
		const app = createApp();

		const response = await app.request(
			"http://localhost/api/help/requestDetails",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(validRequestDetailsPayload),
			},
		);

		const payload = (await response.json()) as RequestDetailsSuccessPayload &
			Record<string, unknown>;

		expect(response.status).toBe(200);
		expect(payload).toEqual(validRequestDetailsPayload);
		expect(payload.body).toBeUndefined();
		expect(payload.ok).toBeUndefined();
	});
});
