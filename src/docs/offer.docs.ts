import { describeRoute, resolver } from "hono-openapi";
import {
	emptyOfferApiResponseSchema,
	paginatedOffersResponseSchema,
} from "../utils/validators/offers/schemas";

export const getVolunteerOffersDocs = describeRoute({
	summary: "Retrieve volunteer offers",
	description:
		"Fetches a paginated list of help offers made by the currently authenticated volunteer.",
	tags: ["Offers"],
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
				"application/json": { schema: resolver(emptyOfferApiResponseSchema) },
			},
		},
		401: {
			description: "Unauthorized",
			content: {
				"application/json": { schema: resolver(emptyOfferApiResponseSchema) },
			},
		},
		403: {
			description: "Forbidden - Volunteer profile not found",
			content: {
				"application/json": { schema: resolver(emptyOfferApiResponseSchema) },
			},
		},
		500: {
			description: "Internal server error",
			content: {
				"application/json": { schema: resolver(emptyOfferApiResponseSchema) },
			},
		},
	},
});

export const updateOfferStatusDocs = describeRoute({
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
});

export const deleteOfferDocs = describeRoute({
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
});
