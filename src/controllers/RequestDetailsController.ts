import { Hono } from "hono";
import type { AppEnv } from "../app";
import { Controller } from "../utils/controller";
import { inject } from "../di";
import { RequestDetailsService } from "../services/RequestDetailsService";
import { sendApiResponse } from "../utils/apiReponse";
import { authMiddlware } from "../middlware/authMiddleware";
import { requestDetailsSchema } from "../validation";
import {
	buildValidationErrorData,
	validator,
} from "../utils/validators/honoValidator";
import {
	deleteTaskDetailsDocs,
	updateTaskDetailsDocs,
} from "../docs/request-details.docs";

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
			updateTaskDetailsDocs,
			validator("json", requestDetailsSchema, (result, c) => {
				if (!result.success) {
					return sendApiResponse(c, buildValidationErrorData(result.error), {
						statusCode: 400,
					});
				}
			}),
			async (c) => {
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
						c.req.valid("json"),
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
					return sendApiResponse(c, null, {
						kind: "serverError",
						message: "Could not update help request details",
					});
				}
			},
		)

		.delete("/:id/details", deleteTaskDetailsDocs, async (c) => {
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
		});
}
