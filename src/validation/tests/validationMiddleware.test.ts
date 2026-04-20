import { describe, expect, it } from "bun:test";
import { Hono } from "hono";

import { validationMiddleware } from "../middleware/validationMiddleware";

const validPayload = {
	title: "Need transport support",
	description: "I need a ride to the clinic tomorrow morning.",
	urgency: "HIGH",
	status: "OPEN",
	anonymousMode: false,
	category: "Transport",
	requestDetails: {
		notes: "Pickup at the main entrance.",
		languageNeeded: "Romanian",
		safetyNotes: "Wheelchair assistance needed.",
	},
};

const createTestApp = (): Hono => {
	const app = new Hono();

	app.use("*", validationMiddleware).post("/help", async (context) => {
		const body = await context.req.json();
		return context.json({
			ok: true,
			body,
		});
	});

	return app;
};

describe("validationMiddleware", () => {
	it("returns 200 for a full valid request body", async () => {
		const app = createTestApp();

		const response = await app.request("http://localhost/help", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(validPayload),
		});

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			ok: true,
			body: validPayload,
		});
	});

	it("returns 400 for missing required fields", async () => {
		const app = createTestApp();

		const response = await app.request("http://localhost/help", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				title: "",
				description: "",
			}),
		});

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			errors: [
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
				{
					field: "requestDetails",
					message: "Invalid input: expected object, received undefined",
				},
			],
		});
	});

	it("returns 400 for wrong field types", async () => {
		const app = createTestApp();

		const response = await app.request("http://localhost/help", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				title: 123,
				description: false,
				urgency: "URGENT",
				status: "PENDING",
				anonymousMode: "no",
				category: 999,
				requestDetails: {
					notes: 1,
					languageNeeded: true,
					safetyNotes: null,
				},
			}),
		});

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			errors: [
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
				{
					field: "requestDetails.notes",
					message: "Notes is required",
				},
				{
					field: "requestDetails.languageNeeded",
					message: "Language needed is required",
				},
				{
					field: "requestDetails.safetyNotes",
					message: "Safety notes is required",
				},
			],
		});
	});

	it("returns 400 for unknown fields", async () => {
		const app = createTestApp();

		const response = await app.request("http://localhost/help", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				...validPayload,
				extraField: "unexpected",
			}),
		});

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			errors: [
				{
					field: "body",
					message: "Unrecognized key: \"extraField\"",
				},
			],
		});
	});

	it("returns 400 for invalid nested requestDetails", async () => {
		const app = createTestApp();

		const response = await app.request("http://localhost/help", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				...validPayload,
				requestDetails: {
					notes: "   ",
					languageNeeded: "",
					safetyNotes: "   ",
				},
			}),
		});

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			errors: [
				{
					field: "requestDetails.notes",
					message: "Notes is required",
				},
				{
					field: "requestDetails.languageNeeded",
					message: "Language needed is required",
				},
				{
					field: "requestDetails.safetyNotes",
					message: "Safety notes is required",
				},
			],
		});
	});
});
