import { Hono } from "hono";
import { describeRoute, resolver, validator as zValidator } from "hono-openapi";
import { z } from "zod";
import { inject } from "../di";
import { RatingsService } from "../services/RatingsService";
import { Controller } from "../utils/controller";

const createRatingSchema = z
	.object({
		taskAssignmentId: z.number().int().positive(),
		writtenByUserId: z.string().min(1, "writtenByUserId is required"),
		receivedByUserId: z.string().min(1, "receivedByUserId is required"),
		stars: z
			.number()
			.int()
			.min(1, "Stars must be at least 1")
			.max(5, "Stars must be at most 5"),
		comment: z.string().trim().min(1, "Comment is required"),
	})
	.meta({
		ref: "CreateRatingRequest",
		example: {
			taskAssignmentId: 1,
			writtenByUserId: "user-1",
			receivedByUserId: "user-2",
			stars: 5,
			comment: "Very helpful and responsive.",
		},
	});

const ratingSchema = createRatingSchema
	.extend({
		id: z.number().int().positive(),
	})
	.meta({
		ref: "Rating",
		example: {
			id: 1,
			taskAssignmentId: 1,
			writtenByUserId: "user-1",
			receivedByUserId: "user-2",
			stars: 5,
			comment: "Very helpful and responsive.",
		},
	});

const ratingErrorSchema = z
	.object({
		error: z.string(),
		details: z.unknown().optional(),
	})
	.meta({
		ref: "RatingError",
	});

@Controller("/ratings")
export class RatingsController {
	constructor(
		@inject(RatingsService) private readonly ratingService: RatingsService,
	) {}
	controller = new Hono()
		.post(
			"/",
			describeRoute({
				summary: "Create rating",
				description: "Creates a rating between users for a task assignment.",
				tags: ["Ratings"],
				responses: {
					200: {
						description: "Rating created successfully",
						content: {
							"application/json": {
								schema: resolver(ratingSchema),
							},
						},
					},
					400: {
						description: "Invalid request body",
						content: {
							"application/json": {
								schema: resolver(ratingErrorSchema),
							},
						},
					},
					404: {
						description: "Rating target not found",
						content: {
							"application/json": {
								schema: resolver(
									z.object({
										data: z.null(),
									}),
								),
							},
						},
					},
					500: {
						description: "Internal server error",
						content: {
							"application/json": {
								schema: resolver(ratingErrorSchema),
							},
						},
					},
				},
			}),
			zValidator("json", createRatingSchema),
			async (c) => {
				try {
					const body = c.req.valid("json");

					const result = await this.ratingService.createRating(body);
					return c.json(result ?? { data: null }, {
						status: result ? 200 : 404,
					});
				} catch (err) {
					console.error("RATING ERROR:", err);
					return c.json({ error: "Internal server error" }, 500);
				}
			},
		)
		.get("/user/:userId", async (c) => {
			try {
				const userId = c.req.param("userId");
				const result = await this.ratingService.getRatingsForUser(userId);

				return c.json(result ?? { data: null }, { status: result ? 200 : 404 });
			} catch (err) {
				console.error("GET RATINGS ERROR: ", err);
				return c.json({ error: "Internal server error" }, 500);
			}
		})
		.get("/user/:userId/summary", async (c) => {
			try {
				const userId = c.req.param("userId");
				const result =
					await this.ratingService.getRatingsSummaryForUser(userId);

				return c.json(result ?? { data: null }, { status: result ? 200 : 404 });
			} catch (err) {
				console.error("GET RATINGS SUMMARY ERROR: ", err);
				return c.json({ error: "Internal server error" }, 500);
			}
		});
}
