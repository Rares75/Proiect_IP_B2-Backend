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
import {
	tasksDeleteSchema,
	tasksGetByIdDocs,
	tasksGetDocs,
	tasksPostDocs,
} from "../docs/guest.docs";
import { isUUIDValid } from "../utils/validators/isUUIDValid";
import { guestTaskIdParamSchema } from "../utils/validators/guest/schemas";
import { validator } from "../utils/validators/honoValidator";

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
			tasksPostDocs,
			validator("json", guestHelpRequestInputSchema, (result, c) => {
				if (!result.success) {
					return sendApiResponse(c, null, {
						kind: "clientError",
					});
				}
			}),
			async (c) => {
				const guestSessionId = c.req.header("X-Guest-Session");
				if (!guestSessionId) {
					return sendApiResponse(c, null, {
						kind: "unauthorized",
						message: "Lipseste header-ul X-Guest-Session",
					});
				}

				const isValidUuid = isUUIDValid(guestSessionId);
				if (!isValidUuid) {
					return sendApiResponse(c, null, {
						kind: "clientError",
						message:
							"Format invalid pentru X-Guest-Session. Trebuie să fie UUID.",
					});
				}

				try {
					const body = c.req.valid("json");
					const result = await this.helpRequestService.createGuestHelpRequest(
						guestSessionId,
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
			tasksGetDocs,
			validator("query", guestTasksQuerySchema, (result, c) => {
				if (!result.success) {
					return sendApiResponse(c, null, {
						kind: "clientError",
						message: "Invalid query param",
					});
				}
			}),
			async (c) => {
				const guestSessionId = c.req.header("X-Guest-Session");
				if (!guestSessionId) {
					return sendApiResponse(c, null, {
						kind: "unauthorized",
						message: "No header X-Guest-Session",
					});
				}

				const isValidUuid = isUUIDValid(guestSessionId);
				if (!isValidUuid) {
					return sendApiResponse(c, null, {
						kind: "clientError",
						message: "Invalid format for X-Guest-Session; must be: UUID.",
					});
				}

				const { page, pageSize, status } = c.req.valid("query");

				try {
					const result = await this.helpRequestService.getGuestHelpRequests(
						guestSessionId,
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
		.get("/tasks/:id/offers", tasksGetByIdDocs, async (c) => {
			const guestSession = c.req.header("X-Guest-Session");
			if (!guestSession) {
				return sendApiResponse(c, null, {
					kind: "unauthorized",
					message: "Missing X-Guest-Session header",
				});
			}

			const isValidUuid = isUUIDValid(guestSession);
			if (!isValidUuid) {
				return sendApiResponse(c, null, {
					kind: "clientError",
					message: "Invalid X-Guest-Session format; must be a UUID",
				});
			}

			const taskId = Number(c.req.param("id"));
			if (!Number.isInteger(taskId) || taskId <= 0) {
				return sendApiResponse(c, null, {
					kind: "clientError",
					message: "Task id must be a valid positive number",
				});
			}

			const query = c.req.query();
			const page = query.page ? Number(query.page) : 1;
			const pageSize = query.pageSize ? Number(query.pageSize) : 10;

			if (
				!Number.isInteger(page) ||
				page < 1 ||
				!Number.isInteger(pageSize) ||
				pageSize < 1 ||
				pageSize > 50
			) {
				return sendApiResponse(c, null, {
					kind: "clientError",
					message: "Invalid pagination parameters",
				});
			}

			const statusRaw = query.status as
				| "PENDING"
				| "ACCEPTED"
				| "REJECTED"
				| undefined;

			if (
				statusRaw &&
				!["PENDING", "ACCEPTED", "REJECTED"].includes(statusRaw)
			) {
				return sendApiResponse(c, null, {
					kind: "clientError",
					message: "Invalid status; accepted: PENDING, ACCEPTED, REJECTED",
				});
			}

			try {
				const result =
					await this.helpRequestService.getPaginatedOffersForGuestTaskOwner(
						taskId,
						guestSession,
						page,
						pageSize,
						statusRaw,
					);

				return sendApiResponse(c, result);
			} catch (error) {
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

				console.error("[GuestController GET /tasks/:id/offers]:", error);
				return sendApiResponse(c, null, { kind: "serverError" });
			}
		})
		.delete(
			"/tasks/:id",
			tasksDeleteSchema,
			validator("param", guestTaskIdParamSchema, (result, c) => {
				if (!result.success) {
					return sendApiResponse(c, null, {
						kind: "clientError",
						message: "Task id must be a valid positive number",
					});
				}
			}),
			async (c) => {
				const guestSession = c.req.header("X-Guest-Session");

				// Validate header presence and format
				if (!guestSession) {
					return sendApiResponse(c, null, {
						kind: "unauthorized",
						message: "Missing X-Guest-Session header",
					});
				}

				const isValidUuid = isUUIDValid(guestSession);
				if (!isValidUuid) {
					return sendApiResponse(c, null, {
						kind: "clientError",
						message: "Invalid X-Guest-Session format; must be a UUID",
					});
				}

				try {
					const { id: requestId } = c.req.valid("param");

					await this.helpRequestService.deleteGuestHelpRequest(
						guestSession,
						requestId,
					);

					return sendApiResponse(c, null, {
						statusCode: 204,
					});
				} catch (error: unknown) {
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
