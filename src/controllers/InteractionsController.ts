import { Hono } from "hono";
import { Controller } from "../utils/controller";
import { InteractionsService } from "../services/InteractionsService";
import { sendApiResponse } from "../utils/apiReponse";
import { logger } from "../utils/logger";
import { inject } from "../di";

@Controller("/users")
export class InteractionsController {
	constructor(
		@inject(InteractionsService)
		private readonly interactionsService: InteractionsService,
	) {}

	controller = new Hono().get("/:userId/interactions", async (c) => {
		try {
			const userId = c.req.param("userId");
			const page = Number(c.req.query("page") ?? 1);
			const limit = Number(c.req.query("limit") ?? 10);

			if (
				Number.isNaN(page) ||
				page < 1 ||
				Number.isNaN(limit) ||
				limit < 1 ||
				limit > 100
			) {
				return sendApiResponse(c, null, {
					kind: "clientError",
					message: "Invalid pagination parameters.",
				});
			}

			const result = await this.interactionsService.getInteractionsForUser(
				userId,
				page,
				limit,
			);

			return sendApiResponse(c, result.body);
		} catch (err) {
			logger.exception(err);
			return sendApiResponse(c, null, { kind: "serverError" });
		}
	});
}
