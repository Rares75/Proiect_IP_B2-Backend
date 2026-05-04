import { Hono } from "hono";
import type { AppEnv } from "../app";
import { inject } from "../di";
import { authMiddlware } from "../middlware/authMiddleware";
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

const readOfferMessage = async (request: Request): Promise<string | null> => {
	try {
		const body = (await request.json()) as { message?: unknown };
		if (body.message === undefined || body.message === null) {
			return null;
		}

		if (typeof body.message !== "string") {
			throw new ValidationError("'message' must be a string");
		}

		return body.message;
	} catch (error) {
		if (error instanceof ValidationError) {
			throw error;
		}

		return null;
	}
};

@Controller("/")
export class OfferController {
	constructor(
		@inject(OfferService)
		private readonly offerService: OfferService,
	) {}

	controller = new Hono<AppEnv>()
		.use("*", authMiddlware)
		.post("/tasks/:id/offers", async (c) => {
			const helpRequestId = parsePositiveId(c.req.param("id"));
			if (!helpRequestId) {
				return sendApiResponse(c, null, {
					kind: "clientError",
					message: "'id' must be a positive integer",
				});
			}

			try {
				const message = await readOfferMessage(c.req.raw);
				const session = c.get("session");
				const offer = await this.offerService.createOfferForTask(
					helpRequestId,
					session.userId,
					{ message },
				);

				return sendApiResponse(c, offer, { kind: "created" });
			} catch (error) {
				if (error instanceof NotFoundError) {
					return sendApiResponse(c, null, {
						kind: "notFound",
						message: error.message,
					});
				}

				if (error instanceof ValidationError) {
					return sendApiResponse(c, null, {
						kind: "clientError",
						message: error.message,
					});
				}

				throw error;
			}
		})
		.patch("/offers/:id/status", async (c) => {
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
		});
}
