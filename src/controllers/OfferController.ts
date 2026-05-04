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

const parsePositiveId = (value: string): number | undefined => {
	const id = Number(value);
	return Number.isInteger(id) && id > 0 ? id : undefined;
};

@Controller("/")
export class OfferController {
	constructor(
		@inject(OfferService)
		private readonly offerService: OfferService,
	) {}

	controller = new Hono<AppEnv>().patch(
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

			const queryStatus = c.req.query("status");
			let bodyStatus: unknown;

			if (!queryStatus) {
				try {
					const body = (await c.req.json()) as { status?: unknown };
					bodyStatus = body.status;
				} catch {
					bodyStatus = undefined;
				}
			}

			const status = queryStatus ?? bodyStatus;
			if (status !== "ACCEPTED") {
				return sendApiResponse(c, null, {
					kind: "clientError",
					message: "'status' must be ACCEPTED",
				});
			}

			try {
				const session = c.get("session");
				const result = await this.offerService.acceptOffer(
					offerId,
					session.userId,
				);

				return sendApiResponse(c, result);
			} catch (error) {
				if (error instanceof NotFoundError) {
					return sendApiResponse(c, null, {
						kind: "notFound",
						message: error.message,
					});
				}

				if (error instanceof ForbiddenError) {
					return sendApiResponse(c, null, {
						kind: "forbidden",
						message: error.message,
					});
				}

				if (
					error instanceof ValidationError ||
					error instanceof InvalidStatusTransitionError
				) {
					return sendApiResponse(c, null, {
						kind: "clientError",
						message: error.message,
					});
				}

				throw error;
			}
		},
	);
}
