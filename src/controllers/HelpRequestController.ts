import { Hono } from "hono";
import { Controller } from "../utils/controller";
import { inject } from "../di";
import { HelpRequestService } from "../services/HelpRequestService";
import { ModerationError } from "../services/ModerationService";
import { requestStatusEnum } from "../db/enums";
import {
	ConflictError,
	ForbiddenError,
	InvalidStatusTransitionError,
	NotFoundError,
} from "../utils/Errors";

import { authMiddleware } from "../middlware/authMiddleware";
import { validateTasksQuery } from "../utils/validators/queryValidator";
import { sendApiResponse } from "../utils/apiReponse";

type RequestStatus = (typeof requestStatusEnum.enumValues)[number];

const VALID_STATUSES = new Set<RequestStatus>(requestStatusEnum.enumValues);
import {
	createValidationMiddleware,
	helpOfferInputSchema,
	helpRequestInputSchema,
} from "../validation";

@Controller("/tasks")
export class HelpRequestController {
	constructor(
		@inject(HelpRequestService)
		private readonly helpRequestService: HelpRequestService,
	) {}

	controller = new Hono()
		.post(
			"/",
			createValidationMiddleware(helpRequestInputSchema),
			async (c) => {
				try {
					const body = await c.req.json();
					const result = await this.helpRequestService.createHelpRequest(body);
					return c.json(result, 201);
				} catch (error: any) {
					// check if error comes from inappropriate request
					if (error instanceof ModerationError) {
						return c.json({ error: error.message }, 400);
					}

					console.error(error);
					return c.json({ error: "Internal server error" }, 500);
				}
			},
		)

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
				return c.json(dataToReturn, 200);
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

		.patch("/:id/status", async (c) => {
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

		.post(
			"/:id/offers",
			authMiddleware,
			createValidationMiddleware(helpOfferInputSchema),
			async (c) => {
				const requestId = Number(c.req.param("id"));
				if (
					!Number.isInteger(requestId) ||
					requestId <= 0 ||
					requestId > Number.MAX_SAFE_INTEGER
				) {
					return sendApiResponse(c, null, {
						kind: "clientError",
						message:
							"Eroare: ID-ul furnizat este invalid. Trebuie sa fie un numar intreg pozitiv.",
					});
				}

				try {
					const body = await c.req.json();
					const session = c.get("session");
					const result = await this.helpRequestService.createOfferForTask(
						requestId,
						session.userId,
						body,
					);

					return sendApiResponse(c, result, { kind: "created" });
				} catch (error) {
					if (error instanceof NotFoundError) {
						return sendApiResponse(c, null, {
							kind: "notFound",
							message: error.message,
						});
					}

					if (error instanceof ForbiddenError) {
						return sendApiResponse(c, null, {
							statusCode: 403,
							message: error.message,
						});
					}

					if (error instanceof ConflictError) {
						return sendApiResponse(c, null, {
							statusCode: 409,
							message: error.message,
						});
					}

					console.error(error);
					return sendApiResponse(c, null, { kind: "serverError" });
				}
			},
		)

		// BE1-12 & BE1-13 (Paginare + Sortare)
		.get("/", authMiddleware, async (c) => {
			try {
				//Apelam validatorul nostru curat, trimitându-i toți parametrii din URL
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
		});
}
