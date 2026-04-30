import { Hono } from "hono";
import { Controller } from "../utils/controller";
import { inject } from "../di";
import { VolunteerRepository } from "../db/repositories/volunteer.repository";
import { validateOffersQuery } from "../utils/validators/queryValidator";
import { sendApiResponse } from "../utils/apiReponse";
import { authMiddleware } from "../middlware/authMiddleware";
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

@Controller("/offers")
export class OffersController {
	constructor(
		@inject(VolunteerRepository)
		private readonly volunteerRepository: VolunteerRepository,
	) {}

	controller = new Hono().get("/", authMiddleware, async (c) => {
		const user = c.get("user");
		if (!user) {
			return sendApiResponse(c, null, { kind: "unauthorized" });
		}

		const volunteer = await this.volunteerRepository.findByUserId(user.id);
		if (!volunteer) {
			return sendApiResponse(c, null, {
				kind: "notFound",
				message: "Volunteer not found",
				statusCode: 403,
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

			// build response with pagination metadata
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
	});
}
