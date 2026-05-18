import {
	helpRequestCategoryEnum,
	requestStatusEnum,
	urgencyLevelEnum,
} from "../../../db/enums";
import { z } from "zod";

export const emptyTaskApiResponseSchema = z
	.object({
		data: z.null(),
		message: z.string().optional(),
		notFound: z.boolean().optional(),
		isUnauthorized: z.boolean().optional(),
		isServerError: z.boolean().optional(),
		isClientError: z.boolean().optional(),
		app: z
			.object({
				url: z.string().optional(),
			})
			.optional(),
		statusCode: z.number().optional(),
	})
	.meta({
		ref: "EmptyTaskApiResponse",
		example: {
			data: null,
			message: "An error occurred",
			notFound: false,
			isUnauthorized: false,
			isServerError: false,
			isClientError: true,
			app: { url: "http://localhost:3000" },
			statusCode: 400,
		},
	});

export const successTaskDetailsSchema = z
	.object({
		data: z.any(),
		message: z.string().optional(),
		notFound: z.boolean().optional(),
		isUnauthorized: z.boolean().optional(),
		isServerError: z.boolean().optional(),
		isClientError: z.boolean().optional(),
		app: z
			.object({
				url: z.string().optional(),
			})
			.optional(),
		statusCode: z.number().optional(),
	})
	.meta({
		ref: "SuccessTaskDetailsResponse",
		example: {
			data: {},
			message: "Request completed successfully",
			notFound: false,
			isUnauthorized: false,
			isServerError: false,
			isClientError: false,
			app: { url: "http://localhost:3000" },
			statusCode: 200,
		},
	});

export const moderationResponseSchema = z
	.object({
		data: z.object({
			level: z.literal("BLOCKED"),
			reason: z.string(),
		}),
		message: z.string(),
		notFound: z.boolean(),
		isUnauthorized: z.boolean(),
		isServerError: z.boolean(),
		isClientError: z.boolean(),
		app: z.object({
			url: z.string(),
		}),
		statusCode: z.literal(400),
	})
	.meta({
		ref: "ModerationErrorResponse",
		example: {
			data: {
				level: "BLOCKED",
				reason: "Content violates policies regarding financial scams.",
			},
			message: "Inappropriate content detected.",
			notFound: false,
			isUnauthorized: false,
			isServerError: false,
			isClientError: true,
			app: { url: "http://localhost:3000" },
			statusCode: 400,
		},
	});

export const taskValidationErrorSchema = z
	.object({
		data: z
			.object({
				errors: z.array(
					z.object({
						field: z.string(),
						message: z.string(),
					}),
				),
			})
			.nullable(),
		message: z.string(),
		notFound: z.boolean(),
		isUnauthorized: z.boolean(),
		isServerError: z.boolean(),
		isClientError: z.boolean(),
		app: z.object({
			url: z.string(),
		}),
		statusCode: z.number(),
	})
	.meta({
		ref: "TaskValidationErrorResponse",
		example: {
			data: {
				errors: [{ field: "notes", message: "Notes is required" }],
			},
			message: "Invalid request",
			notFound: false,
			isUnauthorized: false,
			isServerError: false,
			isClientError: true,
			app: { url: "http://localhost:3000" },
			statusCode: 400,
		},
	});

export const helpRequestCreateBodySchema = {
	type: "object",
	required: [
		"title",
		"urgency",
		"status",
		"anonymousMode",
		"category",
		"location",
	],
	properties: {
		guestSessionId: {
			type: "string",
			maxLength: 128,
			description: "Guest session identifier when the requester is anonymous",
		},
		title: {
			type: "string",
			minLength: 1,
			description: "Short title of the help request",
		},
		description: {
			type: "string",
			minLength: 1,
			description:
				"Detailed description of the request. Either description or audioUrl must be provided.",
		},
		audioUrl: {
			type: "string",
			format: "uri",
			description:
				"Audio recording URL. Either description or audioUrl must be provided.",
		},
		urgency: {
			type: "string",
			enum: [...urgencyLevelEnum.enumValues],
		},
		status: {
			type: "string",
			enum: [...requestStatusEnum.enumValues],
		},
		anonymousMode: {
			type: "boolean",
		},
		city: {
			type: "string",
			maxLength: 100,
		},
		addressText: {
			type: "string",
		},
		category: {
			type: "string",
			enum: [...helpRequestCategoryEnum.enumValues],
		},
		skillsNeeded: {
			type: "array",
			items: {
				type: "string",
				minLength: 1,
			},
		},
		location: {
			type: "object",
			required: ["x", "y"],
			properties: {
				x: { type: "number" },
				y: { type: "number" },
			},
		},
	},
} as const;
