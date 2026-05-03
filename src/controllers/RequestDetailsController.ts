import { Hono } from "hono";
import type { AppEnv } from "../app";
import { Controller } from "../utils/controller";
import { inject } from "../di";
import { z } from "zod";
import { RequestDetailsService } from "../services/RequestDetailsService";
import { sendApiResponse } from "../utils/apiReponse";
import { authMiddlware } from "../middlware/authMiddleware";
import { describeRoute, resolver } from "hono-openapi";

// Zod Schemas for Swagger documentation and validation
const requestDetailsSchema = z
	.object({
		notes: z
			.string({
				error: "Notes is required",
			})
			.trim()
			.min(1, "Notes is required"),
		languageNeeded: z
			.string({
				error: "Language needed is required",
			})
			.trim()
			.min(1, "Language needed is required")
			.max(50, "language needed must be at most 50 characters"),
		safetyNotes: z
			.string({
				error: "Safety notes is required",
			})
			.trim()
			.min(1, "Safety notes is required"),
	})
	.strict();

// Response schemas using meta() for OpenAPI documentation
const validationErrorSchema = z
	.object({
		data: z
			.object({
				errors: z.array(
					z.object({
						field: z.string(),
						message: z.string(),
					}),
				),
			})
			.nullable(),
		message: z.string(),
		notFound: z.boolean(),
		isUnauthorized: z.boolean(),
		isServerError: z.boolean(),
		isClientError: z.boolean(),
		app: z.object({
			url: z.string(),
		}),
		statusCode: z.number(),
	})
	.meta({
		ref: "ValidationErrorResponse",
		example: {
			data: {
				errors: [
					{
						field: "notes",
						message: "Notes is required",
					},
				],
			},
			message: "Invalid request",
			notFound: false,
			isUnauthorized: false,
			isServerError: false,
			isClientError: true,
			app: { url: "http://localhost:3000" },
			statusCode: 400,
		},
	});

const emptyApiResponseSchema = z
	.object({
		data: z.null(),
		message: z.string(),
		notFound: z.boolean(),
		isUnauthorized: z.boolean(),
		isServerError: z.boolean(),
		isClientError: z.boolean(),
		app: z.object({
			url: z.string(),
		}),
		statusCode: z.number(),
	})
	.meta({
		ref: "EmptyApiResponse",
		example: {
			data: null,
			message: "Resource not found",
			notFound: true,
			isUnauthorized: false,
			isServerError: false,
			isClientError: false,
			app: { url: "http://localhost:3000" },
			statusCode: 404,
		},
	});

const successDetailsSchema = z
	.object({
		data: z.any(),
		message: z.string(),
		notFound: z.boolean(),
		isUnauthorized: z.boolean(),
		isServerError: z.boolean(),
		isClientError: z.boolean(),
		app: z.object({
			url: z.string(),
		}),
		statusCode: z.number(),
	})
	.meta({
		ref: "SuccessDetailsResponse",
		example: {
			data: {},
			message: "Request completed successfully",
			notFound: false,
			isUnauthorized: false,
			isServerError: false,
			isClientError: false,
			app: { url: "http://localhost:3000" },
			statusCode: 200,
		},
	});

const requireSession = async (c: any) => {
	const existingSession = c.get("session");
	if (existingSession) {
		return existingSession;
	}

	const response = await authMiddlware(c, async () => {});
	if (response) {
		return response;
	}

	return c.get("session");
};

@Controller("/tasks")
export class RequestDetailsController {
	constructor(
		@inject(RequestDetailsService)
		private readonly requestDetailsService: RequestDetailsService,
	) {}

	controller = new Hono<AppEnv>()
		.put(
			"/:id/details",
			describeRoute({
				summary: "Update/Add task details",
				description:
					"Performs an upsert for the details of an existing task. Requires authorization and an OPEN status.",
				tags: ["Tasks"],
				responses: {
					200: {
						description: "The details have been successfully updated",
						content: {
							"application/json": { schema: resolver(successDetailsSchema) },
						},
					},
					400: {
						description: "Invalid data in the request body or invalid ID",
						content: {
							"application/json": { schema: resolver(validationErrorSchema) },
						},
					},
					403: {
						description: "Access denied for this user",
						content: {
							"application/json": { schema: resolver(emptyApiResponseSchema) },
						},
					},
					404: {
						description: "The task was not found",
						content: {
							"application/json": { schema: resolver(emptyApiResponseSchema) },
						},
					},
					409: {
						description:
							"Conflict: Details can only be edited when the status is OPEN",
						content: {
							"application/json": { schema: resolver(emptyApiResponseSchema) },
						},
					},
					500: {
						description: "Internal server error",
						content: {
							"application/json": { schema: resolver(emptyApiResponseSchema) },
						},
					},
				},
			}),
			//zValidator("json", requestDetailsSchema),
			async (c) => {
				const body = await c.req.json().catch(() => null);
				const parsedBody = requestDetailsSchema.safeParse(body);
				if (!parsedBody.success) {
					/*
					// Return legacy validation shape used by tests: { errors: [...] }
					return c.json(
						{
							errors: parsedBody.error.issues.map((issue) => ({
								field: issue.path.length === 0 ? "body" : issue.path.join("."),
								message: issue.message,
							})),
						},
						400,
					);
					*/
					return sendApiResponse(
						c,
						{
							errors: parsedBody.error.issues.map((issue) => ({
								field: issue.path.length === 0 ? "body" : issue.path.join("."),
								message: issue.message,
							})),
						},
						{
							statusCode: 400,
						},
					);
				}

				try {
					const id = Number(c.req.param("id"));
					if (!Number.isInteger(id)) {
						//return c.json({ error: "Invalid id" }, 400);
						return sendApiResponse(c, null, {
							statusCode: 400,
							message: "Invalid id",
						});
					}

					const session = await requireSession(c);
					if (session instanceof Response) {
						return session;
					}
					if (this.requestDetailsService.authorizeDetailsMutation) {
						const authorization =
							await this.requestDetailsService.authorizeDetailsMutation(
								id,
								session.userId,
							);
						if (authorization.status === "notFound") {
							return sendApiResponse(c, null, {
								kind: "notFound",
								message: "Task not found",
							});
							//return c.json({ error: "Task not found" }, 404);
						}
						if (authorization.status === "forbidden") {
							return sendApiResponse(c, null, {
								statusCode: 403,
								message: "Forbidden",
							});
							//return c.json({ error: "Forbidden" }, 403);
						}
						if (authorization.status === "invalidStatus") {
							return sendApiResponse(c, null, {
								statusCode: 409,
								message:
									'"Details can only be updated when task status is OPEN."',
							});
						}
					}

					const result = await this.requestDetailsService.upsertDetails(
						id,
						parsedBody.data,
					);

					if ("message" in result) {
						//return c.json({ error: result.message }, result.status);
						return sendApiResponse(c, null, {
							statusCode: result.status,
							message: result.message,
						});
					}

					if ("notFound" in result && result.notFound) {
						return sendApiResponse(c, null, {
							kind: "notFound",
							message: "Task not found",
						});
						//return c.json({ error: "Task not found" }, 404);
					}

					return sendApiResponse(c, "data" in result ? result.data : null, {
						statusCode: "status" in result ? result.status : 200,
					});
				} catch (_error) {
					return c.json(
						{ error: "Could not update help request details" },
						500,
					);
				}
			},
		)

		.delete(
			"/:id/details",
			describeRoute({
				summary: "Delete task details",
				description:
					"Deletes the details of an existing task. Requires authorization and the task status must be OPEN.",
				tags: ["Tasks"],
				responses: {
					204: {
						description:
							"The details have been successfully deleted (No Content)",
					},
					400: {
						description: "Invalid request ID",
						content: {
							"application/json": { schema: resolver(emptyApiResponseSchema) },
						},
					},
					403: {
						description: "Access denied for this user",
						content: {
							"application/json": { schema: resolver(emptyApiResponseSchema) },
						},
					},
					404: {
						description: "The task was not found",
						content: {
							"application/json": { schema: resolver(emptyApiResponseSchema) },
						},
					},
					409: {
						description:
							"Conflict: Details cannot be deleted when task status is MATCHED, IN_PROGRESS, COMPLETED, CANCELLED or REJECTED.",
						content: {
							"application/json": { schema: resolver(emptyApiResponseSchema) },
						},
					},
				},
			}),
			async (c) => {
				const id = Number(c.req.param("id"));
				if (!Number.isInteger(id)) {
					return sendApiResponse(c, null, {
						statusCode: 400,
						message: "Invalid id",
					});
					//return c.json({ error: "Invalid id" }, 400);
				}

				const session = await requireSession(c);
				if (session instanceof Response) {
					return session;
				}
				if (this.requestDetailsService.authorizeDetailsMutation) {
					const authorization =
						await this.requestDetailsService.authorizeDetailsMutation(
							id,
							session.userId,
						);
					if (authorization.status === "notFound") {
						return sendApiResponse(c, null, {
							kind: "notFound",
							message: "Task not found",
						});
						//return c.json({ message: "Task not found." }, 404);
					}
					if (authorization.status === "forbidden") {
						return sendApiResponse(c, null, {
							statusCode: 403,
							message: "Forbidden",
						});
						//return c.json({ message: "Forbidden" }, 403);
					}
					if (authorization.status === "invalidStatus") {
						return sendApiResponse(c, null, {
							statusCode: 409,
							message:
								"Details cannot be deleted when task status is MATCHED, IN_PROGRESS, COMPLETED, CANCELLED or REJECTED.",
						});
					}
				}

				const result =
					await this.requestDetailsService.deleteHelpRequestDetails(id);

				if (result.status === 204) {
					//return c.body(null, 204);
					return sendApiResponse(c, null, { kind: "noContent" });
				}

				//return c.json(result.body, result.status);
				return sendApiResponse(c, null, {
					statusCode: result.status,
					message: result.body.message,
				});
			},
		);
}
