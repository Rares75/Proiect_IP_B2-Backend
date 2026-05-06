import { Hono } from "hono";
import type { AppEnv } from "../app";
import { inject } from "../di";
import { authMiddleware } from "../middlware/authMiddleware";
import { describeRoute } from "hono-openapi";
import { Controller } from "../utils/controller";
import {
	ForbiddenError,
	InvalidStatusTransitionError,
	NotFoundError,
	ValidationError,
} from "../utils/Errors";
import { OfferService } from "../services/OfferService";
import { sendApiResponse } from "../utils/apiReponse";
import { z } from "zod";

const parsePositiveId = (value: string): number | undefined => {
	const id = Number(value);
	return Number.isInteger(id) && id > 0 ? id : undefined;
};

const offerStatusTransitionSchema = z
	.object({
		status: z.enum(["ACCEPTED", "REJECTED", "PENDING"]),
	})
	.strict();

@Controller("/")
export class OfferController {
	constructor(
		@inject(OfferService)
		private readonly offerService: OfferService,
	) {}

	controller = new Hono<AppEnv>()
		.patch(
			"/offers/:id/status",
			authMiddleware,
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
					const session = c.get("session");
					if (!session?.userId) {
						return sendApiResponse(c, null, { kind: "unauthorized" });
					}
					const result = await this.offerService.updateOfferStatus(
						offerId,
						session.userId,
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
		)

		//BE1-26
		.delete(
			"/offers/:id",
			authMiddleware,
			describeRoute({
				summary: "Withdraw an offer",
				description:
					"Allows a volunteer to withdraw their PENDING offer. Performs a hard delete.",
				tags: ["Offers"],
				responses: {
					204: { description: "Offer deleted successfully" },
					400: { description: "Invalid id" },
					401: { description: "Unauthorized" },
					403: { description: "Forbidden" },
					404: { description: "Offer not found" },
					409: { description: "Offer is not PENDING" },
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

				try {
					const session = c.get("session");
					if (!session?.userId) {
						return sendApiResponse(c, null, { kind: "unauthorized" });
					}

					await this.offerService.deleteOffer(offerId, session.userId);

					// Status 204 "No Content" înseamnă succes
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

					// Mapăm ValidationError pe 409 Conflict 
					if (error instanceof ValidationError) {
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
