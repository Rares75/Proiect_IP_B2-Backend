import { Hono } from "hono";
import { Controller } from "../utils/controller";
import { authMiddlware } from "../middlware/authMiddleware";
import { sendApiResponse } from "../utils/apiReponse";
import { logger } from "../utils/logger";
import { BecomeVolunteerService } from "../services/BecomeVolunteerService";
import { inject } from "../di";
import { NotFoundError } from "../utils/Errors";
import { z } from "zod";
import { describeRoute, resolver } from "hono-openapi";

const becomeVolunteerResponseSchema = z.object({
	message: z.string(),
	volunteerId: z.number().int().positive(),
});

const errorResponseSchema = z.object({
	data: z.null(),
	error: z.object({
		kind: z.string(),
		message: z.string().optional(),
	}),
});

@Controller("/users")
export class BecomeVolunteerController {
	constructor(
		@inject(BecomeVolunteerService)
		private readonly becomeVolunteerService: BecomeVolunteerService,
	) {}

	controller = new Hono().use(authMiddlware).post(
		"/become-volunteer",
		describeRoute({
			summary: "Become a volunteer",
			description:
				"Upgrades the authenticated user's role to volunteer. Creates a volunteer record and updates the user role. Returns 409 if the user is already a volunteer.",
			tags: ["Users"],
			responses: {
				201: {
					description: "User successfully became a volunteer",
					content: {
						"application/json": {
							schema: resolver(becomeVolunteerResponseSchema),
						},
					},
				},
				401: {
					description: "Unauthorized - session missing",
					content: {
						"application/json": {
							schema: resolver(errorResponseSchema),
						},
					},
				},
				404: {
					description: "User not found",
					content: {
						"application/json": {
							schema: resolver(errorResponseSchema),
						},
					},
				},
				409: {
					description: "User is already a volunteer",
					content: {
						"application/json": {
							schema: resolver(errorResponseSchema),
						},
					},
				},
				500: {
					description: "Internal server error",
					content: {
						"application/json": {
							schema: resolver(errorResponseSchema),
						},
					},
				},
			},
		}),
		async (c) => {
			const session = c.get("session");
			if (!session) {
				return sendApiResponse(c, null, { kind: "unauthorized" });
			}

			try {
				const volunteer = await this.becomeVolunteerService.becomeVolunteer(
					session.userId,
				);

				return sendApiResponse(
					c,
					{
						message: "You are now a volunteer",
						volunteerId: volunteer.id,
					},
					{ kind: "created" },
				);
			} catch (error: any) {
				if (error.message === "User is already a volunteer") {
					return sendApiResponse(c, null, {
						kind: "clientError",
						message: "User is already a volunteer",
					});
				}
				if (error instanceof NotFoundError) {
					return sendApiResponse(c, null, { kind: "notFound" });
				}
				logger.exception(error);
				return sendApiResponse(c, null, { kind: "serverError" });
			}
		},
	);
}
