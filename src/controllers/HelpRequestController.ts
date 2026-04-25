import { Hono } from "hono";
import type { AppEnv } from "../app";
import { Controller } from "../utils/controller";
import { inject } from "../di";
import { HelpRequestService } from "../services/HelpRequestService";
import { requestStatusEnum } from "../db/enums";
import type { CreateHelpRequestDTO } from "../db/repositories/helpRequest.repository";
import { authMiddlware } from "../middlware/authMiddleware";
import { InvalidStatusTransitionError, NotFoundError } from "../utils/Errors";
import {
	createValidationMiddleware,
	helpRequestInputSchema,
} from "../validation";

type RequestStatus = (typeof requestStatusEnum.enumValues)[number];
type HelpRequestResponse = Awaited<
	ReturnType<HelpRequestService["getHelpRequestById"]>
>;
type ExistingHelpRequestResponse = Exclude<HelpRequestResponse, undefined>;

const VALID_STATUSES = new Set<RequestStatus>(requestStatusEnum.enumValues);

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
		.use("*", authMiddlware)
		.use("/", createValidationMiddleware(helpRequestInputSchema))

		.post("/", async (c) => {
			try {
				const session = c.get("session");
				const body = (await c.req.json()) as CreateHelpRequestDTO & {
					userId?: unknown;
				};
				const safeBody = removeClientOwnerFields(body);
				const result = await this.helpRequestService.createHelpRequest({
					...safeBody,
					requestedByUserId: session.userId,
				});
				return c.json(result, 201);
			} catch {
				return c.json({ message: "Internal server error" }, 500);
			}
		})

		.get("/", async (c) => {
			const limit = Number(c.req.query("limit") ?? 50);
			const offset = Number(c.req.query("offset") ?? 0);

			const result = await this.helpRequestService.getHelpRequests(
				Number.isInteger(limit) ? limit : 50,
				Number.isInteger(offset) ? offset : 0,
			);

			return c.json(result, 200);
		})

		.get("/:id", async (c) => {
			try {
				const idParam = c.req.param("id");
				const requestedId = Number(idParam);

				if (
					!Number.isInteger(requestedId) ||
					requestedId <= 0 ||
					requestedId > Number.MAX_SAFE_INTEGER
				) {
					return c.json(
						{
							message:
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
							message: `Eroare: Task-ul cu ID-ul '${requestedId}' nu exista in sistem.`,
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
						message:
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
					{ message: "'id' must be a valid numeric request identifier" },
					400,
				);
			}

			let body: { status?: unknown };
			try {
				body = await c.req.json();
			} catch {
				return c.json({ message: "Request body must be valid JSON" }, 400);
			}

			const { status } = body;

			if (
				typeof status !== "string" ||
				!VALID_STATUSES.has(status as RequestStatus)
			) {
				return c.json(
					{
						message: `'status' must be one of: ${[...VALID_STATUSES].join(", ")}`,
					},
					400,
				);
			}

			try {
				const session = c.get("session");
				const task =
					await this.helpRequestService.getHelpRequestForAuthorization(
						requestId,
					);
				if (!task) {
					return c.json(
						{ message: `HelpRequest with id ${requestId} not found` },
						404,
					);
				}

				const assignment =
					await this.helpRequestService.getAssignmentAuthorization(
						requestId,
					);
				const isOwner = task.requestedByUserId === session.userId;
				const isAssignedVolunteer =
					assignment?.volunteerUserId === session.userId;

				if (!isOwner && !isAssignedVolunteer) {
					return c.json({ message: "Forbidden" }, 403);
				}

				const updated = await this.helpRequestService.updateHelpRequestStatus(
					requestId,
					status as RequestStatus,
				);
				return c.json(updated, 200);
			} catch (error) {
				if (error instanceof NotFoundError) {
					return c.json({ message: error.message }, 404);
				}

				if (error instanceof InvalidStatusTransitionError) {
					return c.json({ message: error.message }, 400);
				}

				throw error;
			}
		});
}
