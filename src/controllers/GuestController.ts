import { Hono } from "hono";
import { Controller } from "../utils/controller";
import { inject } from "../di";
import { HelpRequestService } from "../services/HelpRequestService";
import { GuestSessionService } from "../services/GuestSessionService";
import { ModerationError } from "../services/ModerationService";
import {
	guestHelpRequestInputSchema,
	guestTasksQuerySchema,
} from "../validation/schemas/helpRequest.schema";
import { sendApiResponse } from "../utils/apiReponse";
import { z } from "zod";
import { describeRoute, resolver, validator as zValidator } from "hono-openapi";

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
		);
}
