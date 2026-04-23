/// <reference types="bun-types" />

import { describe, expect, it } from "bun:test";
import { Hono } from "hono";

import { queryValidationMiddleware } from "../middleware/queryValidationMiddleware";
import type { ValidationErrorResponse } from "../types/validation.types";
import { validationMiddleware } from "../middleware/validationMiddleware";

const createQueryApp = (): Hono => {
	const app = new Hono();

	app.use("*", queryValidationMiddleware).get("/tasks", (context) =>
		context.json({
			ok: true,
			query: context.req.query(),
		}),
	);

	return app;
};

describe("queryValidationMiddleware", () => {
	it("returns 400 for invalid query params and reports all detected errors", async () => {
		const app = createQueryApp();

		const response = await app.request(
			"http://localhost/tasks?page=abc&pageSize=0&sortBy=titlu&order=RANDOM&status=DONE&city=&language=&lat=999&lng=999&radius=0",
		);

		const payload = (await response.json()) as ValidationErrorResponse;

		expect(response.status).toBe(400);
		expect(payload).toEqual({
			errors: [
				{
					field: "page",
					message: "Page must be a number",
				},
				{
					field: "pageSize",
					message: "Page size must be greater than 0",
				},
				{
					field: "sortBy",
					message: "Sort by must be one of: title, date, status, city",
				},
				{
					field: "order",
					message: "Order must be either ASC or DESC",
				},
				{
					field: "status",
					message: "Status must be a valid request status",
				},
				{
					field: "city",
					message: "City must not be empty",
				},
				{
					field: "language",
					message: "Language must not be empty",
				},
				{
					field: "lat",
					message: "Latitude must be between -90 and 90",
				},
				{
					field: "lng",
					message: "Longitude must be between -180 and 180",
				},
				{
					field: "radius",
					message: "Radius must be greater than 0",
				},
			],
		});
	});

	it("returns 400 when pageSize exceeds the maximum", async () => {
		const app = createQueryApp();

		const response = await app.request("http://localhost/tasks?pageSize=200");

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			errors: [
				{
					field: "pageSize",
					message: "Page size must be less than or equal to 100",
				},
			],
		});
	});

	it("returns 400 when latitude is provided without longitude", async () => {
		const app = createQueryApp();

		const response = await app.request("http://localhost/tasks?lat=47");

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			errors: [
				{
					field: "lng",
					message: "Longitude is required when latitude is provided",
				},
			],
		});
	});

	it("returns 400 when radius is negative", async () => {
		const app = createQueryApp();

		const response = await app.request("http://localhost/tasks?radius=-1");

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			errors: [
				{
					field: "radius",
					message: "Radius must be greater than 0",
				},
			],
		});
	});

	it("skips query validation for non-GET requests", async () => {
		const app = new Hono();

		app.use("*", queryValidationMiddleware).post("/tasks", (context) =>
			context.json({
				method: context.req.method,
			}),
		);

		const response = await app.request(
			"http://localhost/tasks?page=abc&radius=0",
			{
				method: "POST",
			},
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			method: "POST",
		});
	});

	it("lets valid GET query params reach the handler without modifying them", async () => {
		const app = createQueryApp();
		const url =
			"http://localhost/tasks?page=2&pageSize=20&sortBy=title&order=ASC&status=OPEN&city=Bucharest&language=Romanian&lat=47&lng=25&radius=15";

		const response = await app.request(url);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			ok: true,
			query: {
				page: "2",
				pageSize: "20",
				sortBy: "title",
				order: "ASC",
				status: "OPEN",
				city: "Bucharest",
				language: "Romanian",
				lat: "47",
				lng: "25",
				radius: "15",
			},
		});
	});

	it("does not affect existing body validation behavior", async () => {
		const app = new Hono();

		app.use("*", validationMiddleware).post("/help", async (context) =>
			context.json(await context.req.json()),
		);

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
			],
		});
	});
});
