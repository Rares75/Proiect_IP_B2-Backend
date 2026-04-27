import { Hono } from "hono";
import { inject } from "../di";
import { RatingsService } from "../services/RatingsService";
import { Controller } from "../utils/controller";
import { createRatingSchema } from "../utils/validators/ratingsValidator";
import { sendApiResponse } from "../utils/apiReponse";
import { logger } from "../utils/logger";

@Controller("/ratings")
export class RatingsController {
	constructor(
		@inject(RatingsService) private readonly ratingService: RatingsService,
	) {}
	controller = new Hono()
		.post("/", async (c) => {
			const body = await c.req.json();
			const parsed = createRatingSchema.safeParse(body);
			if (!parsed.success)
				return sendApiResponse(c, null, {
					kind: "clientError",
					message: "Failed to validate input",
				});

			try {
				const result = await this.ratingService.createRating(parsed.data);

				if (!result) {
					return sendApiResponse(c, null, {
						kind: "clientError",
						message: "Rating already exists or rating is not allowed",
					});
				}

				return sendApiResponse(c, result, { kind: "created" });
			} catch (error) {
				logger.exception(error);
				return sendApiResponse(c, null, { kind: "serverError" });
			}
		})
		.get("/user/:userId", async (c) => {
			const { userId } = c.req.param();

			try {
				const result = await this.ratingService.getRatingsForUser(userId);
				return sendApiResponse(c, result);
			} catch (error) {
				logger.exception(error);
				return sendApiResponse(c, null, { kind: "serverError" });
			}
		})
		.get("/user/:userId/summary", async (c) => {
			const { userId } = c.req.param();

			try {
				const result = await this.ratingService.getRatingsSummaryForUser(
					userId,
				);
				return sendApiResponse(c, result);
			} catch (error) {
				logger.exception(error);
				return sendApiResponse(c, null, { kind: "serverError" });
			}
		});
}
