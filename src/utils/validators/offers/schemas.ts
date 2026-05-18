import { z } from "zod";

export const offerStatusTransitionSchema = z
	.object({
		status: z.enum(["ACCEPTED", "REJECTED", "PENDING"]),
	})
	.strict();

export const offerWithTaskSchema = z.object({
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

export const paginatedOffersResponseSchema = z
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

export const emptyOfferApiResponseSchema = z
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
		ref: "OfferEmptyApiResponse",
		example: {
			data: null,
			message: "An error occurred",
			isClientError: true,
			statusCode: 400,
		},
	});
