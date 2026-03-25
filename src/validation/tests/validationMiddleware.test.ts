import { describe, expect, it } from "bun:test";
import { Hono } from "hono";

import { registerValidation } from "../middleware/registerValidation";

const createTestApp = (): Hono => {
	const app = new Hono();

	registerValidation(app);

	app.post("/help", async (context) => {
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
				name: "",
				email: "invalid-email",
				message: "",
				age: "not-a-number",
			}),
		});

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			errors: [
				{
					field: "name",
					message: "Name is required",
				},
				{
					field: "email",
					message: "Email must be valid",
				},
				{
					field: "message",
					message: "Message is required",
				},
				{
					field: "age",
					message: "Must be a number",
				},
			],
		});
	});

	it("passes a valid request body through unchanged", async () => {
		const app = createTestApp();

		const payload = {
			name: "Jane Doe",
			email: "jane@example.com",
			message: "Need help with my account",
			age: 32,
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
