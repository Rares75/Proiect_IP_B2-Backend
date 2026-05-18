import { z } from "zod";

export const ratingItemSchema = z.object({
	id: z.number().int().positive(),
	taskAssignmentId: z.number().int().positive(),
	writtenByUserId: z.string(),
	receivedByUserId: z.string(),
	stars: z.number().int().min(1).max(5),
	comment: z.string(),
	createdAt: z.string().datetime(),
});

export const ratingResponseEnvelopeSchema = z.object({
	data: ratingItemSchema,
	message: z.string(),
	notFound: z.boolean(),
	isUnauthorized: z.boolean(),
	isServerError: z.boolean(),
	isClientError: z.boolean(),
	app: z.object({
		url: z.string(),
	}),
	statusCode: z.number().int(),
});

export const ratingsListResponseEnvelopeSchema = z.object({
	data: z.array(ratingItemSchema),
	message: z.string(),
	notFound: z.boolean(),
	isUnauthorized: z.boolean(),
	isServerError: z.boolean(),
	isClientError: z.boolean(),
	app: z.object({
		url: z.string(),
	}),
	statusCode: z.number().int(),
});

export const ratingSummaryResponseEnvelopeSchema = z.object({
	data: z.object({
		averageRating: z.string().nullable(),
		ratingsCount: z.number().int(),
	}),
	message: z.string(),
	notFound: z.boolean(),
	isUnauthorized: z.boolean(),
	isServerError: z.boolean(),
	isClientError: z.boolean(),
	app: z.object({
		url: z.string(),
	}),
	statusCode: z.number().int(),
});

export const ratingErrorResponseEnvelopeSchema = z.object({
	data: z.null(),
	message: z.string(),
	notFound: z.boolean(),
	isUnauthorized: z.boolean(),
	isServerError: z.boolean(),
	isClientError: z.boolean(),
	app: z.object({
		url: z.string(),
	}),
	statusCode: z.number().int(),
});
