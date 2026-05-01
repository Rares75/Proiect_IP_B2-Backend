import { Hono } from "hono";
import { inject } from "../di";
import type { AppEnv } from "../app";
import { authMiddlware } from "../middlware/authMiddleware";
import { RatingsService } from "../services/RatingsService";
import { Controller } from "../utils/controller";
import { createRatingSchema } from "../utils/validators/ratingsValidator";
import { sendApiResponse } from "../utils/apiReponse";
import { logger } from "../utils/logger";
import { describeRoute } from "hono-openapi";

@Controller("/ratings")
export class RatingsController {
	constructor(
		@inject(RatingsService) private readonly ratingService: RatingsService,
	) {}
	controller = new Hono<AppEnv>()
		.post(
			"/",
			describeRoute({
				tags: ["Ratings"],
				summary: "Create a new rating",
				description: `
Create a rating for a user after completing a task.
Only task participants (requester or volunteer) can rate each other.
Ratings can only be created for completed task assignments.
				`,
				requestBody: {
					content: {
						"application/json": {
							schema: {
								type: "object",
								required: [
									"taskAssignmentId",
									"writtenByUserId",
									"receivedByUserId",
									"stars",
									"comment",
								],
								properties: {
									taskAssignmentId: {
										type: "integer",
										description: "ID of the completed task assignment",
										example: 1,
									},
									writtenByUserId: {
										type: "string",
										description: "ID of the user giving the rating",
										example: "user123",
									},
									receivedByUserId: {
										type: "string",
										description: "ID of the user receiving the rating",
										example: "user456",
									},
									stars: {
										type: "integer",
										minimum: 1,
										maximum: 5,
										description: "Star rating from 1 to 5",
										example: 5,
									},
									comment: {
										type: "string",
										minLength: 1,
										description: "Feedback comment for the rating",
										example: "Great volunteer, very professional and helpful",
									},
								},
							},
						},
					},
				},
				responses: {
					201: {
						description: "Rating created successfully",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										data: {
											type: "object",
											properties: {
												id: { type: "integer", example: 1 },
												taskAssignmentId: { type: "integer", example: 1 },
												writtenByUserId: { type: "string", example: "user123" },
												receivedByUserId: { type: "string", example: "user456" },
												stars: { type: "integer", example: 5 },
												comment: { type: "string", example: "Great volunteer" },
												createdAt: {
													type: "string",
													format: "date-time",
													example: "2024-01-15T10:30:00Z",
												},
											},
										},
										message: { type: "string", example: "Resource created successfully" },
										notFound: { type: "boolean", example: false },
										isUnauthorized: { type: "boolean", example: false },
										isServerError: { type: "boolean", example: false },
										isClientError: { type: "boolean", example: false },
										app: {
											type: "object",
											properties: {
												url: { type: "string", example: "http://localhost:3000" },
											},
										},
										statusCode: { type: "integer", example: 201 },
									},
								},
							},
						},
					},
					400: {
						description: "Validation error or business rule violation",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										data: { type: "null", example: null },
										message: { type: "string", example: "Rating already exists or rating is not allowed" },
										notFound: { type: "boolean", example: false },
										isUnauthorized: { type: "boolean", example: false },
										isServerError: { type: "boolean", example: false },
										isClientError: { type: "boolean", example: true },
										app: {
											type: "object",
											properties: {
												url: { type: "string", example: "http://localhost:3000" },
											},
										},
										statusCode: { type: "integer", example: 400 },
									},
								},
							},
						},
					},
					500: {
						description: "Server error",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										data: { type: "null", example: null },
										message: { type: "string", example: "Internal server error" },
										notFound: { type: "boolean", example: false },
										isUnauthorized: { type: "boolean", example: false },
										isServerError: { type: "boolean", example: true },
										isClientError: { type: "boolean", example: false },
										app: {
											type: "object",
											properties: {
												url: { type: "string", example: "http://localhost:3000" },
											},
										},
										statusCode: { type: "integer", example: 500 },
									},
								},
							},
						},
					},
				},
			}),
			async (c) => {
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
			},
		)
		.get(
			"/user/:userId",
			describeRoute({
				tags: ["Ratings"],
				summary: "Get all ratings for a user",
				description: `
Retrieve all ratings that a user has received.
This includes ratings from both requesters and volunteers.
				`,
				parameters: [
					{
						name: "userId",
						in: "path",
						required: true,
						description: "ID of the user to get ratings for",
						schema: {
							type: "string",
							example: "user456",
						},
					},
				],
				responses: {
					200: {
						description: "List of ratings for the user",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										data: {
											type: "array",
											items: {
												type: "object",
												properties: {
													id: { type: "integer", example: 1 },
													taskAssignmentId: { type: "integer", example: 1 },
													writtenByUserId: { type: "string", example: "user123" },
													receivedByUserId: { type: "string", example: "user456" },
													stars: { type: "integer", example: 5 },
													comment: { type: "string", example: "Great work!" },
													createdAt: {
														type: "string",
														format: "date-time",
														example: "2024-01-15T10:30:00Z",
													},
												},
											},
										},
										message: { type: "string", example: "Request completed successfully" },
										notFound: { type: "boolean", example: false },
										isUnauthorized: { type: "boolean", example: false },
										isServerError: { type: "boolean", example: false },
										isClientError: { type: "boolean", example: false },
										app: {
											type: "object",
											properties: {
												url: { type: "string", example: "http://localhost:3000" },
											},
										},
										statusCode: { type: "integer", example: 200 },
									},
								},
							},
						},
					},
					400: {
						description: "Invalid user ID",
					},
					500: {
						description: "Server error",
					},
				},
			}),
			async (c) => {
				const { userId } = c.req.param();

				try {
					const result = await this.ratingService.getRatingsForUser(userId);
					return sendApiResponse(c, result);
				} catch (error) {
					logger.exception(error);
					return sendApiResponse(c, null, { kind: "serverError" });
				}
			},
		)
		.get(
			"/user/:userId/summary",
			describeRoute({
				tags: ["Ratings"],
				summary: "Get rating summary for a user",
				description: `
Get aggregated rating statistics for a user including:
- Average rating score
- Total number of ratings received
				`,
				parameters: [
					{
						name: "userId",
						in: "path",
						required: true,
						description: "ID of the user to get rating summary for",
						schema: {
							type: "string",
							example: "user456",
						},
					},
				],
				responses: {
					200: {
						description: "Rating summary for the user",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										data: {
											type: "object",
											properties: {
												averageRating: {
													type: ["string", "null"],
													description: "Average rating score (1-5), null if no ratings",
													example: "4.5",
												},
												ratingsCount: {
													type: "integer",
													description: "Total number of ratings received",
													example: 10,
												},
											},
										},
										message: { type: "string", example: "Request completed successfully" },
										notFound: { type: "boolean", example: false },
										isUnauthorized: { type: "boolean", example: false },
										isServerError: { type: "boolean", example: false },
										isClientError: { type: "boolean", example: false },
										app: {
											type: "object",
											properties: {
												url: { type: "string", example: "http://localhost:3000" },
											},
										},
										statusCode: { type: "integer", example: 200 },
									},
								},
							},
						},
					},
					400: {
						description: "Invalid user ID",
					},
					500: {
						description: "Server error",
					},
				},
			}),
			async (c) => {
				const { userId } = c.req.param();

				try {
					const result =
						await this.ratingService.getRatingsSummaryForUser(userId);
					return sendApiResponse(c, result);
				} catch (error) {
					logger.exception(error);
					return sendApiResponse(c, null, { kind: "serverError" });
				}
			},
		);
}