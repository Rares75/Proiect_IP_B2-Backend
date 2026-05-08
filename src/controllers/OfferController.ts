import { Hono } from "hono";
import auth from "../auth";
import type { AppEnv } from "../app";
import { inject } from "../di";
import { authMiddleware } from "../middlware/authMiddleware";
import { describeRoute, resolver } from "hono-openapi";
import { Controller } from "../utils/controller";
import {
	ForbiddenError,
	InvalidStatusTransitionError,
	NotFoundError,
	ValidationError,
} from "../utils/Errors";
import { OfferService } from "../services/OfferService";
import { z } from "zod";
import { VolunteerRepository } from "../db/repositories/volunteer.repository";
import { validateOffersQuery } from "../utils/validators/queryValidator";
import { sendApiResponse } from "../utils/apiReponse";
import { logger } from "../utils/logger";

//Type definitions for offers response
export interface OfferWithTaskData {
	id: number;
	volunteerId: number;
	helpRequestId: number;
	message: string | null;
	status: "PENDING" | "ACCEPTED" | "REJECTED";
	createdAt: Date;
	task: {
		id: number;
		title: string;
		urgency: string;
		status: string;
		city: string | null;
		description: string | null;
	};
}

export interface PaginatedOffersResponse {
	data: OfferWithTaskData[];
	meta: {
		currentPage: number;
		pageSize: number;
		totalItems: number;
		totalPages: number;
		hasNextPage: boolean;
		hasPreviousPage: boolean;
	};
}

const parsePositiveId = (value: string): number | undefined => {
	const id = Number(value);
	return Number.isInteger(id) && id > 0 ? id : undefined;
};

const offerStatusTransitionSchema = z
	.object({
		status: z.enum(["ACCEPTED", "REJECTED", "PENDING"]),
	})
	.strict();

//schemas for documentation

const offerWithTaskSchema = z.object({
	id: z.number(),
	volunteerId: z.number(),
	helpRequestId: z.number(),
	message: z.string().nullable(),
	status: z.enum(["PENDING", "ACCEPTED", "REJECTED"]),
	createdAt: z.union([z.string(), z.date()]),
	task: z.object({
		id: z.number(),
		title: z.string(),
		urgency: z.string(),
		status: z.string(),
		city: z.string().nullable(),
		description: z.string().nullable(),
	}),
});

const paginatedOffersResponseSchema = z
	.object({
		data: z.array(offerWithTaskSchema),
		meta: z.object({
			currentPage: z.number(),
			pageSize: z.number(),
			totalItems: z.number(),
			totalPages: z.number(),
			hasNextPage: z.boolean(),
			hasPreviousPage: z.boolean(),
		}),
	})
	.meta({
		ref: "PaginatedOffersResponse",
		example: {
			data: [
				{
					id: 101,
					volunteerId: 42,
					helpRequestId: 2005,
					message: "I have a car and can deliver the supplies this afternoon.",
					status: "PENDING",
					createdAt: "2023-11-01T14:32:00Z",
					task: {
						id: 2005,
						title: "Deliver winter clothes",
						urgency: "HIGH",
						status: "OPEN",
						city: "Iasi",
						description:
							"Looking for someone to transport 5 boxes of winter clothes.",
					},
				},
			],
			meta: {
				currentPage: 1,
				pageSize: 10,
				totalItems: 24,
				totalPages: 3,
				hasNextPage: true,
				hasPreviousPage: false,
			},
		},
	});

// Empty/Error Response Schema
const emptyApiResponseSchema = z
	.object({
		data: z.null(),
		message: z.string().optional(),
		notFound: z.boolean().optional(),
		isUnauthorized: z.boolean().optional(),
		isServerError: z.boolean().optional(),
		isClientError: z.boolean().optional(),
		app: z.object({ url: z.string().optional() }).optional(),
		statusCode: z.number().optional(),
	})
	.meta({
		ref: "EmptyApiResponse",
		example: {
			data: null,
			message: "An error occurred",
			isClientError: true,
			statusCode: 400,
		},
	});

@Controller("/offers")
export class OfferController {
	constructor(
		@inject(OfferService)
		private readonly offerService: OfferService,
		@inject(VolunteerRepository)
		private readonly volunteerRepository: VolunteerRepository,
	) {}
	controller = new Hono<AppEnv>()

		.get(
			"/",
			describeRoute({
				summary: "Retrieve volunteer offers",
				description:
					"Fetches a paginated list of help offers made by the currently authenticated volunteer.",
				tags: ["Offers"],
				// Note: If you have a query validation middleware, you can also define `request: { query: resolver(...) }`
				responses: {
					200: {
						description: "Successfully retrieved the paginated list of offers",
						content: {
							"application/json": {
								schema: resolver(paginatedOffersResponseSchema),
							},
						},
					},
					400: {
						description: "Invalid query parameters",
						content: {
							"application/json": { schema: resolver(emptyApiResponseSchema) },
						},
					},
					401: {
						description: "Unauthorized",
						content: {
							"application/json": { schema: resolver(emptyApiResponseSchema) },
						},
					},
					403: {
						description: "Forbidden - Volunteer profile not found",
						content: {
							"application/json": { schema: resolver(emptyApiResponseSchema) },
						},
					},
					500: {
						description: "Internal server error",
						content: {
							"application/json": { schema: resolver(emptyApiResponseSchema) },
						},
					},
				},
			}),
			authMiddleware,
			async (c) => {
				const user = c.get("user");
				if (!user) {
					return sendApiResponse(c, null, { kind: "unauthorized" });
				}

				const volunteer = await this.volunteerRepository.findByUserId(user.id);
				if (!volunteer) {
					return sendApiResponse(c, null, {
						kind: "forbidden",
						message: "Volunteer not found",
					});
				}

				// parse and validate query parameters
				const query = {
					page: c.req.query("page"),
					pageSize: c.req.query("pageSize"),
					status: c.req.query("status"),
				};

				const validation = validateOffersQuery(query);
				if (validation.error) {
					return sendApiResponse(c, null, {
						kind: "clientError",
						message: validation.error,
					});
				}

				const { page, pageSize, status } = validation.validData as any;

				// fetch offers with pagination and filters
				try {
					const result = await this.volunteerRepository.findOffersByVolunteer(
						volunteer.id,
						{
							status,
							page,
							pageSize,
						},
					);

					// Always return the standardized API envelope for this endpoint
					// Each item contains task title, urgency, status, and city
					const response: PaginatedOffersResponse = {
						data: result.offers,
						meta: {
							currentPage: page,
							pageSize,
							totalItems: result.totalCount,
							totalPages: Math.ceil(result.totalCount / pageSize),
							hasNextPage: page < Math.ceil(result.totalCount / pageSize),
							hasPreviousPage: page > 1,
						},
					};

					return sendApiResponse(c, response);
				} catch (error) {
					logger.exception(error);
					return sendApiResponse(c, null, { kind: "serverError" });
				}
			},
		)

		.patch(
			"/:id/status",
			describeRoute({
				summary: "Accept offer status",
				description:
					"Updates an offer status to ACCEPTED for the authenticated task owner.",
				tags: ["Offers"],
				responses: {
					200: { description: "Offer accepted successfully" },
					400: { description: "Invalid id or invalid status value" },
					401: { description: "Unauthorized" },
					403: { description: "Forbidden" },
					404: { description: "Offer not found" },
					409: { description: "Invalid status transition" },
				},
			}),
			async (c) => {
				const offerId = parsePositiveId(c.req.param("id"));
				if (!offerId) {
					return sendApiResponse(c, null, {
						kind: "clientError",
						message: "'id' must be a positive integer",
					});
				}

				const body = await c.req.json().catch(() => null);
				const parsedBody = offerStatusTransitionSchema.safeParse(body);
				if (!parsedBody.success) {
					return sendApiResponse(c, null, {
						kind: "clientError",
						message: "Request body must contain a valid status",
					});
				}

				try {
					const sessionData = await auth.api.getSession({
						headers: c.req.raw.headers,
					});
					const guestSessionId = c.req.header("X-Guest-Session");

					if (sessionData?.session?.userId) {
						const result = await this.offerService.updateOfferStatus(
							offerId,
							sessionData.session.userId,
							parsedBody.data.status,
						);

						return sendApiResponse(c, result, { kind: "success" });
					}

					if (!guestSessionId) {
						return sendApiResponse(c, null, { kind: "unauthorized" });
					}

					const result = await this.offerService.updateGuestOfferStatus(
						offerId,
						guestSessionId,
						parsedBody.data.status,
					);

					return sendApiResponse(c, result, { kind: "success" });
				} catch (error) {
					if (error instanceof NotFoundError) {
						return sendApiResponse(c, null, {
							kind: "notFound",
							message: error.message,
						});
					}

					if (error instanceof ForbiddenError) {
						return sendApiResponse(c, null, {
							statusCode: 403,
							message: error.message,
						});
					}

					if (
						error instanceof ValidationError ||
						error instanceof InvalidStatusTransitionError
					) {
						return sendApiResponse(c, null, {
							statusCode: 409,
							message: error.message,
						});
					}

					throw error;
				}
			},
		);
}
