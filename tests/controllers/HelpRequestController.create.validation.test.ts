import { beforeEach, describe, expect, mock, test } from "bun:test";
import { Hono } from "hono";

//const Controller = () => (_target: unknown) => {};

const { HelpRequestController } = await import(
	"../../src/controllers/HelpRequestController"
);

const validPayload = {
	title: "Need transport support",
	description: "I need a ride to the clinic tomorrow morning.",
	urgency: "HIGH",
	status: "OPEN",
	anonymousMode: false,
	category: "FACE_TO_FACE",
	location: { x: 47.15, y: 27.58 },
};

describe("POST /tasks validation", () => {
	let app: Hono;
	let createHelpRequest: ReturnType<typeof mock>;

	beforeEach(() => {
		createHelpRequest = mock(async (body: unknown) => ({
			id: 101,
			...(body as Record<string, unknown>),
		}));

		const controller = new HelpRequestController({
			createHelpRequest,
		} as any);

		app = new Hono();
		app.route("/tasks", controller.controller);
	});

	test("returns 400 for invalid help request body on the real route", async () => {
		const response = await app.request("http://localhost/tasks", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
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
					field: "location",
					message: "Invalid input: expected object, received undefined",
				},
			],
		});
		expect(createHelpRequest).not.toHaveBeenCalled();
	});

	test("returns 400 for extra fields on the real route", async () => {
		const response = await app.request("http://localhost/tasks", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
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
					message: 'Unrecognized key: "extraField"',
				},
			],
		});
		expect(createHelpRequest).not.toHaveBeenCalled();
	});

	test("lets a valid help request reach the handler without wrapping the response", async () => {
		const response = await app.request("http://localhost/tasks", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(validPayload),
		});

		expect(response.status).toBe(201);
		expect(createHelpRequest).toHaveBeenCalledTimes(1);
		expect(createHelpRequest).toHaveBeenCalledWith(validPayload);
		expect(await response.json()).toEqual({
			id: 101,
			...validPayload,
		});
	});
});
