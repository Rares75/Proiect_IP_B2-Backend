import { Hono } from "hono";
import auth from "../auth";
import type { AppEnv } from "../app";
import { inject } from "../di";
import { authMiddleware } from "../middlware/authMiddleware";
import { Controller } from "../utils/controller";
import {
	ForbiddenError,
	InvalidStatusTransitionError,
	NotFoundError,
	ValidationError,
} from "../utils/Errors";
import { OfferService } from "../services/OfferService";
import { VolunteerRepository } from "../db/repositories/volunteer.repository";
import { sendApiResponse } from "../utils/apiReponse";
import { logger } from "../utils/logger";
import {
	deleteOfferDocs,
	getVolunteerOffersDocs,
	updateOfferStatusDocs,
} from "../docs/offer.docs";
import { offerStatusTransitionSchema } from "../utils/validators/offers/schemas";
import z from "zod";
import { validator } from "../utils/validators/honoValidator";

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

const validOfferStatuses = ["PENDING", "ACCEPTED", "REJECTED"] as const;

const payloadSchema = z.object({
	page: z
		.string()
		.optional()
		.transform((value) => (value ? Number(value) : 1))
		.pipe(z.number().int().min(1, "Error: 'page' trebuie sa fie minim 1")),
	pageSize: z
		.string()
		.optional()
		.transform((value) => (value ? Number(value) : 10))
		.pipe(
			z
				.number()
				.int()
				.min(1, "Error: 'pageSize' trebuie sa fie intre 1 si 50")
				.max(50, "Error: 'pageSize' trebuie sa fie intre 1 si 50"),
		),
	status: z
		.string()
		.optional()
		.transform((value) => value?.toUpperCase())
		.refine(
			(value) =>
				value === undefined ||
				validOfferStatuses.includes(
					value as (typeof validOfferStatuses)[number],
				),
			{
				message: `Error: 'status' accepta doar: ${validOfferStatuses.join(", ")}`,
			},
		)
		.transform(
			(value) => value as (typeof validOfferStatuses)[number] | undefined,
		),
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
			getVolunteerOffersDocs,
			validator("query", payloadSchema, (result, c) => {
				if (!result.success) {
					return sendApiResponse(c, null, {
						kind: "clientError",
						message: result.error[0]?.message ?? "Invalid query parameters",
					});
				}
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

				const query = c.req.valid("query");

				const { page, pageSize, status } = query;

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
			updateOfferStatusDocs,
			validator("json", offerStatusTransitionSchema, (result, c) => {
				if (!result.success) {
					return sendApiResponse(c, null, {
						kind: "clientError",
						message: "Request body must contain a valid status",
					});
				}
			}),
			async (c) => {
				const offerId = parsePositiveId(c.req.param("id"));
				if (!offerId) {
					return sendApiResponse(c, null, {
						kind: "clientError",
						message: "'id' must be a positive integer",
					});
				}

				try {
					const sessionData = await auth.api.getSession({
						headers: c.req.raw.headers,
					});
					const guestSessionId = c.req.header("X-Guest-Session");
					const { status } = c.req.valid("json");

					if (sessionData?.session?.userId) {
						const result = await this.offerService.updateOfferStatus(
							offerId,
							sessionData.session.userId,
							status,
						);

						return sendApiResponse(c, result, { kind: "success" });
					}

					if (!guestSessionId) {
						return sendApiResponse(c, null, { kind: "unauthorized" });
					}

					const result = await this.offerService.updateGuestOfferStatus(
						offerId,
						guestSessionId,
						status,
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
		)
		//BE1-26
		.delete("/:id", deleteOfferDocs, authMiddleware, async (c) => {
			const offerId = parsePositiveId(c.req.param("id"));
			if (!offerId) {
				return sendApiResponse(c, null, {
					kind: "clientError",
					message: "'id' must be a positive integer",
				});
			}

			try {
				const session = c.get("session");
				if (!session?.userId) {
					return sendApiResponse(c, null, { kind: "unauthorized" });
				}

				await this.offerService.deleteOffer(offerId, session.userId);

				return c.body(null, 204);
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

				if (error instanceof ValidationError) {
					return sendApiResponse(c, null, {
						statusCode: 409,
						message: error.message,
					});
				}

				throw error;
			}
		});
}
