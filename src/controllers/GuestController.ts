import { Hono } from "hono";
import { Controller } from "../utils/controller";
import { inject } from "../di";
import { HelpRequestService } from "../services/HelpRequestService";
import { ModerationError } from "../services/ModerationService";
//import { createValidationMiddleware } from "../validation";
import { guestHelpRequestInputSchema } from "../validation/schemas/helpRequest.schema";
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
				title: "Ajutor transport clinică",
				urgency: "CRITICAL",
				status: "OPEN",
			},
			message: "Request completed successfully",
			statusCode: 201,
		},
	});

@Controller("/guest/tasks")
export class GuestController {
	constructor(
		@inject(HelpRequestService)
		private readonly helpRequestService: HelpRequestService,
	) {}

	controller = new Hono().post(
		"/",
		describeRoute({
			summary: "Creează un help request ca guest",
			description:
				"Permite utilizatorilor neautentificați să creeze task-uri urgente (max 3 active).",
			tags: ["Guest Tasks"],
			responses: {
				201: {
					description: "Task creat cu succes",
					content: {
						"application/json": { schema: resolver(guestTaskSuccessSchema) },
					},
				},
				400: { description: "Validare eșuată sau header malformat" },
				401: { description: "Lipsește header-ul X-Guest-Session" },
				429: { description: "Limita de 3 task-uri active a fost atinsă" },
			},
		}), // + ADAUGĂM: Documentația pentru Scalar
		zValidator("json", guestHelpRequestInputSchema, (result, c) => {
			if (!result.success) {
				return sendApiResponse(c, null, {
					kind: "clientError",
					message: "Validation failed",
				});
			}
		}),

		async (c) => {
			// 1. Verificare existenta header obligatoriu
			const guestSession = c.req.header("X-Guest-Session");
			if (!guestSession) {
				return sendApiResponse(c, null, {
					kind: "unauthorized", // Returneaza 401
					message: "Lipsește header-ul X-Guest-Session",
				});
			}

			// 2. Verificare format header (trebuie sa fie UUID)
			const uuidSchema = z.string().uuid();
			const isValidUuid = uuidSchema.safeParse(guestSession);
			if (!isValidUuid.success) {
				return sendApiResponse(c, null, {
					kind: "clientError", // Returneaza 400
					message:
						"Format invalid pentru X-Guest-Session. Trebuie să fie UUID.",
				});
			}

			try {
				const body = c.req.valid("json") as any;
				// 3. Creare task
				const result = await this.helpRequestService.createGuestHelpRequest(
					guestSession,
					body,
				);

				return sendApiResponse(c, result, { kind: "created" }); // Returneaza 201
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
				return sendApiResponse(c, null, { kind: "serverError" }); // Returneaza 500
			}
		},
	);
}
