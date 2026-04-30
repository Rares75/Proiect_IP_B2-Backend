import { beforeEach, describe, expect, mock, test } from "bun:test";
import { Hono } from "hono";

//const Controller = () => (_target: unknown) => {};

const { RequestDetailsController } = await import(
	"../../src/controllers/RequestDetailsController"
);

const validPayload = {
	notes: "Pickup at the main entrance.",
	languageNeeded: "Romanian",
	safetyNotes: "Wheelchair assistance needed.",
};

describe("POST /tasks/:id/details validation", () => {
	let app: Hono;
	let upsertDetails: ReturnType<typeof mock>;

	beforeEach(() => {
		upsertDetails = mock(async (id: number, body: unknown) => ({
			notFound: false,
			data: {
				helpRequestId: id,
				...(body as Record<string, unknown>),
			},
		}));

		const controller = new RequestDetailsController({
			upsertDetails,
		} as any);

		app = new Hono();
		app.route("/tasks", controller.controller);
	});

	test("returns 400 for languageNeeded longer than 50 on the real route", async () => {
		const response = await app.request("http://localhost/tasks/10/details", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				...validPayload,
				languageNeeded: "a".repeat(51),
			}),
		});

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			errors: [
				{
					field: "languageNeeded",
					message: "language needed must be at most 50 characters",
				},
			],
		});
		expect(upsertDetails).not.toHaveBeenCalled();
	});

	test("returns 400 for extra fields on the real route", async () => {
		const response = await app.request("http://localhost/tasks/10/details", {
			method: "PUT",
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
		expect(upsertDetails).not.toHaveBeenCalled();
	});

	test("lets a valid requestDetails body reach the handler without wrapping the response", async () => {
		const response = await app.request("http://localhost/tasks/10/details", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(validPayload),
		});

		expect(response.status).toBe(200);
		expect(upsertDetails).toHaveBeenCalledTimes(1);
		expect(upsertDetails).toHaveBeenCalledWith(10, validPayload);
		expect(await response.json()).toEqual({
			helpRequestId: 10,
			...validPayload,
		});
	});
});
