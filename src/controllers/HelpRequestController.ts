import { Hono } from "hono";
import type { AppEnv } from "../app";
import { Controller } from "../utils/controller";
import { inject } from "../di";
import { HelpRequestService } from "../services/HelpRequestService";
import { ModerationError } from "../services/ModerationService";
import { requestStatusEnum } from "../db/enums";

import { sendApiResponse } from "../utils/apiReponse";

import type { CreateHelpRequestDTO } from "../db/repositories/helpRequest.repository";
import { authMiddlware, authMiddleware } from "../middlware/authMiddleware";
import {
	InvalidStatusTransitionError,
	NotFoundError,
	ForbiddenError,
} from "../utils/Errors";
import { validateTasksQuery } from "../utils/validators/queryValidator";
import {
	createValidationMiddleware,
	helpRequestCreateInputSchema,
} from "../validation";

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
				return c.json(result, 201);
			} catch (error: any) {
				// check if error comes from inappropriate request
				if (error instanceof ModerationError) {
					return c.json({ error: error.message }, 400);
				}

				console.error(error);
				return c.json({ error: "Internal server error" }, 500);
			}
		})

		.get("/", async (c) => {
			try {
				const session = await requireSession(c);
				if (session instanceof Response) {
					return session;
				}
				if (!session) {
					return c.json({ error: "Unauthorized" }, 401);
				}

				//Apelam validatorul nostru curat, trimitandu-i toti parametrii din URL
				const validation = validateTasksQuery(c.req.query());

				//Daca validatorul gaseste o problema
				if (validation.error || !validation.validData) {
					return c.json(
						{ error: validation.error || "Eroare de validare." },
						400,
					);
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

				return c.json(result, 200);
			} catch (error) {
				console.error("Eroare la GET /tasks paginat si sortat:", error);
				return c.json({ error: "Eroare interna a serverului." }, 500);
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
					return c.json(
						{
							error:
								"Eroare: ID-ul furnizat este invalid. Trebuie sa fie un numar intreg pozitiv.",
						},
						400,
					);
				}

				const foundTask =
					await this.helpRequestService.getHelpRequestById(requestedId);

				if (
					!foundTask ||
					(Array.isArray(foundTask) && foundTask.length === 0)
				) {
					return c.json(
						{
							error: `Eroare: Task-ul cu ID-ul '${requestedId}' nu exista in sistem.`,
						},
						404,
					);
				}

				const dataToReturn = Array.isArray(foundTask)
					? foundTask[0]
					: foundTask;
				return c.json(sanitizeAnonymousTask(dataToReturn), 200);
			} catch (error) {
				console.error(
					`Eroare critica la GET /tasks/${c.req.param("id")} :`,
					error,
				);
				return c.json(
					{
						error:
							"Eroare interna a serverului. Va rugam incercati mai tarziu.",
					},
					500,
				);
			}
		})

		.on(["POST", "PATCH"], "/:id/status", async (c) => {
			const requestId = Number(c.req.param("id"));
			if (!Number.isInteger(requestId)) {
				return c.json(
					{ error: "'id' must be a valid numeric request identifier" },
					400,
				);
			}

			let body: { status?: unknown };
			try {
				body = await c.req.json();
			} catch {
				return c.json({ error: "Request body must be valid JSON" }, 400);
			}

			const { status } = body;

			if (
				typeof status !== "string" ||
				!VALID_STATUSES.has(status as RequestStatus)
			) {
				return c.json(
					{
						error: `'status' must be one of: ${[...VALID_STATUSES].join(", ")}`,
					},
					400,
				);
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
					return c.json(
						{ error: `HelpRequest with id ${requestId} not found` },
						404,
					);
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
					return c.json({ message: "Forbidden" }, 403);
				}

				const updated = await this.helpRequestService.updateHelpRequestStatus(
					requestId,
					status as RequestStatus,
				);
				return c.json(updated, 200);
			} catch (error) {
				if (error instanceof NotFoundError) {
					return c.json({ error: error.message }, 404);
				}

				if (error instanceof InvalidStatusTransitionError) {
					return c.json({ error: error.message }, 409);
				}

				throw error;
			}
		})

		.get("/:id/offers", authMiddleware, async (c) => {
			try {
				// Extragem user-ul curent pus de middleware-ul de auth
				const user = c.get("user");
				if (!user?.id) {
					return sendApiResponse(c, null, { kind: "unauthorized" });
				}

				const taskId = Number(c.req.param("id"));
				if (!Number.isInteger(taskId) || taskId <= 0) {
					return sendApiResponse(c, null, { kind: "clientError" });
				}

				// Extragem și validăm query params cu defaults
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
					return sendApiResponse(c, null, { kind: "clientError" });
				}

				const statusRaw = query.status?.toUpperCase();
				if (
					statusRaw &&
					!["PENDING", "ACCEPTED", "REJECTED"].includes(statusRaw)
				) {
					return sendApiResponse(c, null, {
						kind: "clientError",
						message: "invalid status; accepted: PENDING, ACCEPTED, REJECTED",
					});
				}

				const status = statusRaw as
					| "PENDING"
					| "ACCEPTED"
					| "REJECTED"
					| undefined;

				const result =
					await this.helpRequestService.getPaginatedOffersForTaskOwner(
						taskId,
						user.id,
						page,
						pageSize,
						status,
					);

				return sendApiResponse(c, result);
			} catch (error) {
				if (error instanceof NotFoundError) {
					return sendApiResponse(c, null, {
						kind: "notFound",
						message: "the task does not exist",
					});
				}

				if (error instanceof ForbiddenError) {
					return sendApiResponse(c, null, { kind: "forbidden" });
				}

				return sendApiResponse(c, null, { kind: "serverError" });
			}
		});
}
