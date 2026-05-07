import { Hono } from "hono";
import { Controller } from "../utils/controller";
import { inject } from "../di";
import { HelpRequestService } from "../services/HelpRequestService";
import { GuestSessionService } from "../services/GuestSessionService";
import { ModerationError } from "../services/ModerationService";
import { NotFoundError, ForbiddenError, ConflictError } from "../utils/Errors";
import {
	guestHelpRequestInputSchema,
	guestTasksQuerySchema,
} from "../validation";
import { sendApiResponse } from "../utils/apiReponse";
import { z } from "zod";
import { describeRoute, resolver, validator as zValidator } from "hono-openapi";

// OpenAPI schemas for DELETE response examples
const guestDeleteBadRequestSchema = z
	.object({
		data: z.null(),
		message: z.string(),
		isClientError: z.boolean(),
		statusCode: z.literal(400),
	})
	.meta({
		ref: "GuestDeleteBadRequest",
		example: {
			data: null,
			message: "Task id must be a valid number",
			isClientError: true,
			statusCode: 400,
		},
	});

const guestDeleteUnauthorizedSchema = z
	.object({
		data: z.null(),
		message: z.string(),
		isUnauthorized: z.boolean(),
		statusCode: z.literal(401),
	})
	.meta({
		ref: "GuestDeleteUnauthorized",
		example: {
			data: null,
			message: "Missing X-Guest-Session header",
			isUnauthorized: true,
			statusCode: 401,
		},
	});

const guestDeleteForbiddenSchema = z
	.object({
		data: z.null(),
		message: z.string(),
		isForbidden: z.boolean(),
		statusCode: z.literal(403),
	})
	.meta({
		ref: "GuestDeleteForbidden",
		example: {
			data: null,
			message: "Forbidden: X-Guest-Session does not match task owner",
			isForbidden: true,
			statusCode: 403,
		},
	});

const guestDeleteNotFoundSchema = z
	.object({
		data: z.null(),
		message: z.string(),
		notFound: z.boolean(),
		statusCode: z.literal(404),
	})
	.meta({
		ref: "GuestDeleteNotFound",
		example: {
			data: null,
			message: "Task not found",
			notFound: true,
			statusCode: 404,
		},
	});

const guestDeleteConflictSchema = z
	.object({
		data: z.null(),
		message: z.string(),
		isClientError: z.boolean(),
		statusCode: z.literal(409),
	})
	.meta({
		ref: "GuestDeleteConflict",
		example: {
			data: null,
			message: "Conflict: Task cannot be deleted because it is not OPEN",
			isClientError: true,
			statusCode: 409,
		},
	});

// ...existing code...
const guestTaskSuccessSchema = z
	.object({
		data: z.object({
			id: z.string().uuid(),
			title: z.string(),
			urgency: z.string(),
			status: z.string(),
		}),
		message: z.string(),
		statusCode: z.number(),
	})
	.meta({
		ref: "GuestTaskResponse",
		example: {
			data: {
				id: "550e8400-e29b-41d4-a716-446655440000",
				title: "Ajutor transport clinica",
				urgency: "CRITICAL",
				status: "OPEN",
			},
			message: "Request completed successfully",
			statusCode: 201,
		},
	});

@Controller("/guest")
export class GuestController {
	constructor(
		@inject(GuestSessionService)
		private readonly guestSessionService: GuestSessionService,
		@inject(HelpRequestService)
		private readonly helpRequestService: HelpRequestService,
	) {}

	controller = new Hono()
		.post("/session", (c) => {
			const sessionId = this.guestSessionService.createSessionId();

			return sendApiResponse(c, { sessionId }, { kind: "created" });
		})
		.post(
			"/tasks",
			describeRoute({
				summary: "Creeaza un help request ca guest",
				description:
					"Permite utilizatorilor neautentificati sa creeze task-uri urgente (max 3 active).",
				tags: ["Guest Tasks"],
				responses: {
					201: {
						description: "Task creat cu succes",
						content: {
							"application/json": { schema: resolver(guestTaskSuccessSchema) },
						},
					},
					400: { description: "Validare esuata sau header malformat" },
					401: { description: "Lipseste header-ul X-Guest-Session" },
					429: { description: "Limita de 3 task-uri active a fost atinsa" },
				},
			}),
			zValidator("json", guestHelpRequestInputSchema, (result, c) => {
				if (!result.success) {
					return sendApiResponse(c, null, {
						kind: "clientError",
						message: "Validation failed",
					});
				}
			}),
			async (c) => {
				const guestSession = c.req.header("X-Guest-Session");
				if (!guestSession) {
					return sendApiResponse(c, null, {
						kind: "unauthorized",
						message: "Lipseste header-ul X-Guest-Session",
					});
				}

				const isValidUuid = z.string().uuid().safeParse(guestSession);
				if (!isValidUuid.success) {
					return sendApiResponse(c, null, {
						kind: "clientError",
						message:
							"Format invalid pentru X-Guest-Session. Trebuie să fie UUID.",
					});
				}

				try {
					const body = c.req.valid("json") as any;
					const result = await this.helpRequestService.createGuestHelpRequest(
						guestSession,
						body,
					);

					return sendApiResponse(c, result, { kind: "created" });
				} catch (error: any) {
					if (error instanceof ModerationError) {
						return sendApiResponse(c, null, {
							kind: "clientError",
							message: error.message,
						});
					}
					if (error.name === "RateLimitError") {
						return sendApiResponse(c, null, {
							statusCode: 429,
							message: "Limita atinsă. Poți avea maxim 3 task-uri active.",
						});
					}

					console.error(error);
					return sendApiResponse(c, null, { kind: "serverError" });
				}
			},
		)
		.get(
			"/tasks",
			describeRoute({
				summary: "Listeaza task-urile unui guest",
				description:
					"Returneaza task-urile create cu X-Guest-Session. Nu expune informatii despre voluntari sau assignment-uri.",
				tags: ["Guest Tasks"],
				responses: {
					200: { description: "Lista paginata de task-uri" },
					400: { description: "Query params invalizi sau header malformat" },
					401: { description: "Lipseste header-ul X-Guest-Session" },
				},
			}),
			zValidator("query", guestTasksQuerySchema, (result, c) => {
				if (!result.success) {
					return sendApiResponse(c, null, {
						kind: "clientError",
						message: "Invalid query param",
					});
				}
			}),
			async (c) => {
				const guestSession = c.req.header("X-Guest-Session");
				if (!guestSession) {
					return sendApiResponse(c, null, {
						kind: "unauthorized",
						message: "No header X-Guest-Session",
					});
				}

				const isValidUuid = z.string().uuid().safeParse(guestSession);
				if (!isValidUuid.success) {
					return sendApiResponse(c, null, {
						kind: "clientError",
						message: "Invalid format for X-Guest-Session; must be: UUID.",
					});
				}

				const { page, pageSize, status } = c.req.valid("query");

				try {
					const result = await this.helpRequestService.getGuestHelpRequests(
						guestSession,
						page,
						pageSize,
						status,
					);

					return sendApiResponse(c, result);
				} catch (error) {
					console.error(error);
					return sendApiResponse(c, null, { kind: "serverError" });
				}
			},
		)
		// Delete endpoint for a guest to delete his task
		.delete(
			"/tasks/:id",
			describeRoute({
				summary: "Delete a guest-created task",
				description:
					"Deletes a help request created with X-Guest-Session. Only the creator (matching guestSessionId) can delete when status = OPEN.",
				tags: ["Guest Tasks"],
				responses: {
					204: {
						description: "Task deleted successfully",
					},
					400: {
						description: "Invalid task id or invalid X-Guest-Session format",
						content: {
							"application/json": {
								schema: resolver(guestDeleteBadRequestSchema),
							},
						},
					},
					401: {
						description: "Missing X-Guest-Session header",
						content: {
							"application/json": {
								schema: resolver(guestDeleteUnauthorizedSchema),
							},
						},
					},
					403: {
						description: "Session ID does not match task owner",
						content: {
							"application/json": {
								schema: resolver(guestDeleteForbiddenSchema),
							},
						},
					},
					404: {
						description: "Task not found",
						content: {
							"application/json": {
								schema: resolver(guestDeleteNotFoundSchema),
							},
						},
					},
					409: {
						description: "Task is not OPEN and cannot be deleted",
						content: {
							"application/json": {
								schema: resolver(guestDeleteConflictSchema),
							},
						},
					},
				},
			}),
			zValidator(
				"param",
				z.object({
					id: z.coerce
						.number()
						.int()
						.positive("Task id must be a positive integer"),
				}),
				(result, c) => {
					if (!result.success) {
						return sendApiResponse(c, null, {
							kind: "clientError",
							message: "Task id must be a valid positive number",
						});
					}
				},
			),
			async (c) => {
				const guestSession = c.req.header("X-Guest-Session");

				// Validate header presence and format
				if (!guestSession) {
					return sendApiResponse(c, null, {
						kind: "unauthorized",
						message: "Missing X-Guest-Session header",
					});
				}

				const isValidUuid = z.string().uuid().safeParse(guestSession);
				if (!isValidUuid.success) {
					return sendApiResponse(c, null, {
						kind: "clientError",
						message: "Invalid X-Guest-Session format; must be a UUID",
					});
				}

				try {
					const { id: requestId } = c.req.valid("param");

					// Delegate all business logic to service, which will throw appropriate errors
					await this.helpRequestService.deleteGuestHelpRequest(
						guestSession,
						requestId,
					);

					// Success: service completed deletion
					return sendApiResponse(c, null, {
						statusCode: 204,
					});
				} catch (error: any) {
					// Map service errors to HTTP responses
					if (error instanceof NotFoundError) {
						return sendApiResponse(c, null, {
							kind: "notFound",
							message: "Task not found",
						});
					}

					if (error instanceof ForbiddenError) {
						return sendApiResponse(c, null, {
							statusCode: 403,
							message: "Forbidden: X-Guest-Session does not match task owner",
						});
					}

					if (error instanceof ConflictError) {
						return sendApiResponse(c, null, {
							statusCode: 409,
							message:
								"Conflict: Task cannot be deleted because it is not OPEN",
						});
					}

					console.error("[GuestController DELETE /tasks/:id Error]:", error);
					return sendApiResponse(c, null, { kind: "serverError" });
				}
			},
		);
}
