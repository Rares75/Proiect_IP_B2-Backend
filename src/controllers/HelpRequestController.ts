import { Hono } from "hono";
import type { AppEnv } from "../app";
import { Controller } from "../utils/controller";
import { inject } from "../di";
import { HelpRequestService } from "../services/HelpRequestService";
import { ModerationError } from "../services/ModerationService";
import { requestStatusEnum } from "../db/enums";
import type { CreateHelpRequestDTO } from "../db/repositories/helpRequest.repository";
import { authMiddlware } from "../middlware/authMiddleware";
import { InvalidStatusTransitionError, NotFoundError } from "../utils/Errors";
import { validateTasksQuery } from "../utils/validators/queryValidator";
import {
	createValidationMiddleware,
	helpRequestCreateInputSchema,
} from "../validation";
import { sendApiResponse } from "../utils/apiReponse";

type RequestStatus = (typeof requestStatusEnum.enumValues)[number];
type HelpRequestResponse = Awaited<
	ReturnType<HelpRequestService["getHelpRequestById"]>
>;
type ExistingHelpRequestResponse = Exclude<HelpRequestResponse, undefined>;

const VALID_STATUSES = new Set<RequestStatus>(requestStatusEnum.enumValues);

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

const removeClientOwnerFields = (
	body: CreateHelpRequestDTO & { userId?: unknown },
): Omit<CreateHelpRequestDTO, "requestedByUserId"> => {
	const safeBody = { ...body };
	delete safeBody.userId;
	delete safeBody.requestedByUserId;

	return safeBody;
};

const sanitizeAnonymousTask = (
	task: ExistingHelpRequestResponse,
): ExistingHelpRequestResponse | Record<string, unknown> => {
	if (!task.anonymousMode) {
		return task;
	}

	const safeTask: Record<string, unknown> = { ...task };
	delete safeTask.requestedByUserId;
	delete safeTask.userId;
	delete safeTask.ownerId;

	return safeTask;
};

@Controller("/tasks")
export class HelpRequestController {
	constructor(
		@inject(HelpRequestService)
		private readonly helpRequestService: HelpRequestService,
	) {}

	controller = new Hono<AppEnv>()
		.use("/", createValidationMiddleware(helpRequestCreateInputSchema))

		.post("/", async (c) => {
			try {
				const session = await requireSession(c);
				if (session instanceof Response) {
					return session;
				}
				const body = (await c.req.json()) as CreateHelpRequestDTO & {
					userId?: unknown;
				};
				const safeBody = removeClientOwnerFields(body);
				const createData = session
					? {
							...safeBody,
							requestedByUserId: session.userId,
						}
					: safeBody;
				const result = await this.helpRequestService.createHelpRequest(
					createData as CreateHelpRequestDTO,
				);
				//return c.json(result, 201);
				return sendApiResponse(c, result, { kind: "created" });
			} catch (error: any) {
				// check if error comes from inappropriate request
				if (error instanceof ModerationError) {
					//return c.json({ error: error.message }, 400);
					return sendApiResponse(c, null, {
						message: error.message,
						kind: "clientError",
					});
				}

				console.error(error);
				//return c.json({ error: "Internal server error" }, 500);
				return sendApiResponse(c, null, { kind: "serverError" });
			}
		})

		.get("/", async (c) => {
			try {
				const session = await requireSession(c);
				if (session instanceof Response) {
					return session;
				}
				if (!session) {
					//return c.json({ error: "Unauthorized" }, 401);
					return sendApiResponse(c, null, { kind: "unauthorized" });
				}

				//Apelam validatorul nostru curat, trimitandu-i toti parametrii din URL
				const validation = validateTasksQuery(c.req.query());

				//Daca validatorul gaseste o problema
				if (validation.error || !validation.validData) {
					return sendApiResponse(c, null, {
						message: validation.error || "Validation Error.",
						kind: "clientError",
					});
				}

				//Extragem parametrii
				const { page, pageSize, sortBy, order, filters } = validation.validData;
				const result = await this.helpRequestService.getPaginatedTasks(
					page,
					pageSize,
					sortBy,
					order,
					filters,
				);

				return sendApiResponse(c, result, { kind: "success" });
			} catch (error) {
				console.error("Eroare la GET /tasks paginat si sortat:", error);
				//return c.json({ error: "Eroare interna a serverului." }, 500);
				return sendApiResponse(c, null, { kind: "serverError" });
			}
		})

		.get("/:id", async (c) => {
			try {
				const session = await requireSession(c);
				if (session instanceof Response) {
					return session;
				}

				const idParam = c.req.param("id");
				const requestedId = Number(idParam);

				if (
					!Number.isInteger(requestedId) ||
					requestedId <= 0 ||
					requestedId > Number.MAX_SAFE_INTEGER
				) {
					return sendApiResponse(c, null, {
						kind: "clientError",
						message:
							"Error: The ID provided is invalid. It must be a positive integer.",
					});
				}

				const foundTask =
					await this.helpRequestService.getHelpRequestById(requestedId);

				if (
					!foundTask ||
					(Array.isArray(foundTask) && foundTask.length === 0)
				) {
					return sendApiResponse(c, null, {
						kind: "notFound",
						message: `Eroare: Task-ul cu ID-ul '${requestedId}' nu exista in sistem.`,
					});
				}

				const dataToReturn = Array.isArray(foundTask)
					? foundTask[0]
					: foundTask;
				//return c.json(sanitizeAnonymousTask(dataToReturn), 200);
				return sendApiResponse(c, sanitizeAnonymousTask(dataToReturn), {
					kind: "success",
				});
			} catch (error) {
				console.error(
					`Eroare critica la GET /tasks/${c.req.param("id")} :`,
					error,
				);
				return sendApiResponse(c, null, {
					kind: "serverError",
					message: "Internal server error. Please try again later.",
				});
			}
		})

		.patch("/:id/status", async (c) => {
			const requestId = Number(c.req.param("id"));
			if (!Number.isInteger(requestId)) {
				return sendApiResponse(c, null, {
					kind: "clientError",
					message: "'id' must be a valid numeric request identifier",
				});
			}

			let body: { status?: unknown };
			try {
				body = await c.req.json();
			} catch {
				return sendApiResponse(c, null, {
					kind: "clientError",
					message: "Request body must be valid JSON",
				});
				//return c.json({ error: "Request body must be valid JSON" }, 400);
			}

			const { status } = body;

			if (
				typeof status !== "string" ||
				!VALID_STATUSES.has(status as RequestStatus)
			) {
				return sendApiResponse(c, null, {
					kind: "clientError",
					message: `'status' must be one of: ${[...VALID_STATUSES].join(", ")}`,
				});
			}

			try {
				const session = await requireSession(c);
				if (session instanceof Response) {
					return session;
				}
				const task =
					await this.helpRequestService.getHelpRequestForAuthorization(
						requestId,
					);
				if (!task) {
					return sendApiResponse(c, null, {
						kind: "notFound",
						message: `HelpRequest with id ${requestId} not found`,
					});
				}

				const assignment = session
					? await this.helpRequestService.getAssignmentAuthorization(requestId)
					: undefined;
				const isOwner =
					"requestedByUserId" in task &&
					task.requestedByUserId === session?.userId;
				const isAssignedVolunteer =
					assignment?.volunteerUserId === session?.userId;

				if (
					session &&
					(task.requestedByUserId || assignment) &&
					!isOwner &&
					!isAssignedVolunteer
				) {
					//return c.json({ message: "Forbidden" }, 403);
					return sendApiResponse(c, null, {
						statusCode: 403,
						message:
							"You do not have permission to change the status of this help request.",
					});
				}

				const updated = await this.helpRequestService.updateHelpRequestStatus(
					requestId,
					status as RequestStatus,
				);
				//return c.json(updated, 200);
				return sendApiResponse(c, updated, { kind: "success" });
			} catch (error) {
				if (error instanceof NotFoundError) {
					//return c.json({ error: error.message }, 404);
					return sendApiResponse(c, null, {
						kind: "notFound",
						message: error.message,
					});
				}

				if (error instanceof InvalidStatusTransitionError) {
					//return c.json({ error: error.message }, 409);
					return sendApiResponse(c, null, {
						statusCode: 409,
						message: error.message,
					});
				}

				throw error;
			}
		});
}
