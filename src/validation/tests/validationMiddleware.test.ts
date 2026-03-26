import { describe, expect, it } from "bun:test";
import { Hono } from "hono";

import { validationMiddleware } from "../middleware/validationMiddleware";

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
	it("returns 400 with all validation errors for an invalid request body", async () => {
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
			],
		});
	});

	it("passes a valid request body through unchanged", async () => {
		const app = createTestApp();

		const payload = {
			title: "Jane Doe",
			description: "Need help with my account",
		};

		const response = await app.request("http://localhost/help", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		});

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			ok: true,
			body: payload,
		});
	});
});
