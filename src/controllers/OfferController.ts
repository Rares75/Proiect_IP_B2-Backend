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

const parsePositiveId = (value: string): number | undefined => {
	const id = Number(value);
	return Number.isInteger(id) && id > 0 ? id : undefined;
};

const readOfferMessage = async (
	request: Request,
): Promise<string | null> => {
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
				return c.json({ message: "'id' must be a positive integer" }, 400);
			}

			try {
				const message = await readOfferMessage(c.req.raw);
				const session = c.get("session");
				const offer = await this.offerService.createOfferForTask(
					helpRequestId,
					session.userId,
					{ message },
				);

				return c.json(offer, 201);
			} catch (error) {
				if (error instanceof NotFoundError) {
					return c.json({ message: error.message }, 404);
				}

				if (error instanceof ValidationError) {
					return c.json({ message: error.message }, 400);
				}

				throw error;
			}
		})
		.patch("/offers/:id/status", async (c) => {
			const offerId = parsePositiveId(c.req.param("id"));
			if (!offerId) {
				return c.json({ message: "'id' must be a positive integer" }, 400);
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
				return c.json({ message: "'status' must be ACCEPTED" }, 400);
			}

			try {
				const session = c.get("session");
				const result = await this.offerService.acceptOffer(
					offerId,
					session.userId,
				);

				return c.json(result, 200);
			} catch (error) {
				if (error instanceof NotFoundError) {
					return c.json({ message: error.message }, 404);
				}

				if (error instanceof ForbiddenError) {
					return c.json({ message: error.message }, 403);
				}

				if (
					error instanceof ValidationError ||
					error instanceof InvalidStatusTransitionError
				) {
					return c.json({ message: error.message }, 400);
				}

				throw error;
			}
		});
}
