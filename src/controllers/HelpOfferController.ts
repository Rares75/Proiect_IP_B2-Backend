import { Hono } from "hono";
import type { AppEnv } from "../app";
import { Controller } from "../utils/controller";
import { inject } from "../di";
import { authMiddlware } from "../middlware/authMiddleware";
import { sendApiResponse } from "../utils/apiReponse";
import {
	HelpOfferDuplicatePendingError,
	HelpOfferForbiddenError,
	HelpOfferService,
	HelpOfferTaskNotFoundError,
	HelpOfferTaskStatusConflictError,
} from "../services/HelpOfferService";
import { helpOfferCreateInputSchema } from "../validation";

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
export class HelpOfferController {
	constructor(
		@inject(HelpOfferService)
		private readonly helpOfferService: HelpOfferService,
	) {}

	controller = new Hono<AppEnv>().post("/:id/offers", async (c) => {
		const session = await requireSession(c);
		if (session instanceof Response) {
			return session;
		}

		const helpRequestId = Number(c.req.param("id"));
		if (!Number.isInteger(helpRequestId) || helpRequestId <= 0) {
			return sendApiResponse(c, null, {
				kind: "clientError",
				message: "Invalid id",
			});
		}

		const body = await c.req.json().catch(() => null);
		const parsedBody = helpOfferCreateInputSchema.safeParse(body);
		if (!parsedBody.success) {
			return sendApiResponse(
				c,
				{
					errors: parsedBody.error.issues.map((issue) => ({
						field: issue.path.length === 0 ? "body" : issue.path.join("."),
						message: issue.message,
					})),
				},
				{
					statusCode: 400,
				},
			);
		}

		try {
			const createdOffer = await this.helpOfferService.createOffer(
				helpRequestId,
				session.userId,
				parsedBody.data,
			);

			return sendApiResponse(c, createdOffer, { kind: "created" });
		} catch (error) {
			if (error instanceof HelpOfferTaskNotFoundError) {
				return sendApiResponse(c, null, {
					kind: "notFound",
					message: error.message,
				});
			}

			if (error instanceof HelpOfferForbiddenError) {
				return sendApiResponse(c, null, {
					statusCode: 403,
					message: error.message,
				});
			}

			if (
				error instanceof HelpOfferTaskStatusConflictError ||
				error instanceof HelpOfferDuplicatePendingError
			) {
				return sendApiResponse(c, null, {
					statusCode: 409,
					message: error.message,
				});
			}

			console.error("Could not create help offer:", error);
			return sendApiResponse(c, null, { kind: "serverError" });
		}
	});
}
