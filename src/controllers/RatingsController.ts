import { Hono } from "hono";
import { inject } from "../di";
import type { AppEnv } from "../app";
import { RatingsService } from "../services/RatingsService";
import { Controller } from "../utils/controller";
import { createRatingSchema } from "../utils/validators/ratingsValidator";
import {
	createRatingDocs,
	getUserRatingsDocs,
	getUserRatingsSummaryDocs,
} from "../docs/ratings.docs";
import { sendApiResponse } from "../utils/apiReponse";
import { logger } from "../utils/logger";
import { validator } from "../utils/validators/honoValidator";

@Controller("/ratings")
export class RatingsController {
	constructor(
		@inject(RatingsService) private readonly ratingService: RatingsService,
	) {}
	controller = new Hono<AppEnv>()
		.post(
			"/",
			createRatingDocs,
			validator("json", createRatingSchema, (result, c) => {
				if (!result.success) {
					return sendApiResponse(c, null, {
						kind: "clientError",
						message: "Failed to validate input",
					});
				}
			}),
			async (c) => {
				try {
					const result = await this.ratingService.createRating(
						c.req.valid("json"),
					);

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
			},
		)
		.get("/user/:userId", getUserRatingsDocs, async (c) => {
			const { userId } = c.req.param();

			try {
				const result = await this.ratingService.getRatingsForUser(userId);
				return sendApiResponse(c, result);
			} catch (error) {
				logger.exception(error);
				return sendApiResponse(c, null, { kind: "serverError" });
			}
		})
		.get("/user/:userId/summary", getUserRatingsSummaryDocs, async (c) => {
			const { userId } = c.req.param();

			try {
				const result =
					await this.ratingService.getRatingsSummaryForUser(userId);
				return sendApiResponse(c, result);
			} catch (error) {
				logger.exception(error);
				return sendApiResponse(c, null, { kind: "serverError" });
			}
		});
}
