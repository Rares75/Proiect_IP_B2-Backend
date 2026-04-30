import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import type { OpenAPIV3_1 } from "openapi-types";
import { inject } from "../di";
import { RatingsService } from "../services/RatingsService";
import { Controller } from "../utils/controller";
import { createRatingSchema } from "../utils/validators/ratingsValidator";
import { sendApiResponse } from "../utils/apiReponse";
import { logger } from "../utils/logger";

const ratingRequestBodySchema: OpenAPIV3_1.SchemaObject = {
	type: "object",
	required: [
		"taskAssignmentId",
		"writtenByUserId",
		"receivedByUserId",
		"stars",
		"comment",
	],
	properties: {
		taskAssignmentId: { type: "integer", format: "int32" },
		writtenByUserId: { type: "string" },
		receivedByUserId: { type: "string" },
		stars: { type: "integer", format: "int32", minimum: 1, maximum: 5 },
		comment: { type: "string" },
	},
};

const ratingObjectSchema: OpenAPIV3_1.SchemaObject = {
	type: "object",
	required: [
		"id",
		"taskAssignmentId",
		"writtenByUserId",
		"receivedByUserId",
		"stars",
		"createdAt",
	],
	properties: {
		id: { type: "integer", format: "int32" },
		taskAssignmentId: { type: "integer", format: "int32" },
		writtenByUserId: { type: "string" },
		receivedByUserId: { type: "string" },
		stars: { type: "integer", format: "int32", minimum: 1, maximum: 5 },
		comment: { oneOf: [{ type: "string" }, { type: "null" }] },
		createdAt: { type: "string", format: "date-time" },
	},
};

const ratingSummarySchema: OpenAPIV3_1.SchemaObject = {
	type: "object",
	required: ["ratingsCount"],
	properties: {
		averageRating: { oneOf: [{ type: "string" }, { type: "null" }] },
		ratingsCount: { type: "integer", format: "int32" },
	},
};

const apiResponseWrapper = (
	dataSchema: OpenAPIV3_1.SchemaObject,
): OpenAPIV3_1.SchemaObject => ({
	type: "object",
	required: [
		"data",
		"notFound",
		"isUnauthorized",
		"isServerError",
		"isClientError",
		"app",
		"statusCode",
	],
	properties: {
		data: dataSchema,
		message: { type: "string" },
		notFound: { type: "boolean" },
		isUnauthorized: { type: "boolean" },
		isServerError: { type: "boolean" },
		isClientError: { type: "boolean" },
		app: {
			type: "object",
			required: ["url"],
			properties: { url: { type: "string" } },
		},
		statusCode: { type: "integer", format: "int32" },
	},
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
				tags: ["Ratings"],
				summary: "Create a rating",
				description:
					"Allows a task participant to rate the other participant after a completed assignment.",
				requestBody: {
					content: {
						"application/json": { schema: ratingRequestBodySchema },
					},
				},
				responses: {
					"201": {
						description: "Rating created successfully",
						content: {
							"application/json": {
								schema: apiResponseWrapper(ratingObjectSchema),
							},
						},
					},
					"400": {
						description: "Validation failed or rating not allowed",
						content: {
							"application/json": {
								schema: apiResponseWrapper({ type: "null" }),
							},
						},
					},
					"500": {
						description: "Internal server error",
						content: {
							"application/json": {
								schema: apiResponseWrapper({ type: "null" }),
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
				summary: "Get ratings for a user",
				description: "Returns all ratings received by the specified user.",
				parameters: [
					{
						name: "userId",
						in: "path",
						required: true,
						schema: { type: "string" },
						description: "The user ID to retrieve ratings for.",
					},
				],
				responses: {
					"200": {
						description: "Ratings retrieved successfully",
						content: {
							"application/json": {
								schema: apiResponseWrapper({
									type: "array",
									items: ratingObjectSchema,
								}),
							},
						},
					},
					"404": {
						description: "User not found or no ratings available",
						content: {
							"application/json": {
								schema: apiResponseWrapper({ type: "null" }),
							},
						},
					},
					"500": {
						description: "Internal server error",
						content: {
							"application/json": {
								schema: apiResponseWrapper({ type: "null" }),
							},
						},
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
				summary: "Get ratings summary for a user",
				description:
					"Returns the average rating and total ratings count for the specified user.",
				parameters: [
					{
						name: "userId",
						in: "path",
						required: true,
						schema: { type: "string" },
						description: "The user ID to retrieve the rating summary for.",
					},
				],
				responses: {
					"200": {
						description: "Summary retrieved successfully",
						content: {
							"application/json": {
								schema: apiResponseWrapper(ratingSummarySchema),
							},
						},
					},
					"404": {
						description: "User not found or summary unavailable",
						content: {
							"application/json": {
								schema: apiResponseWrapper({ type: "null" }),
							},
						},
					},
					"500": {
						description: "Internal server error",
						content: {
							"application/json": {
								schema: apiResponseWrapper({ type: "null" }),
							},
						},
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
