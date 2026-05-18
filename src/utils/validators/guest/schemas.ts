import * as z from "zod";

export const guestDeleteBadRequestSchema = z
	.object({
		data: z.null(),
		message: z.string(),
		isClientError: z.boolean(),
		statusCode: z.literal(400),
	})
	.meta({
		ref: "GuestDeleteBadRequest",
		example: {
			data: null,
			message: "Task id must be a valid number",
			isClientError: true,
			statusCode: 400,
		},
	});

export const guestDeleteUnauthorizedSchema = z
	.object({
		data: z.null(),
		message: z.string(),
		isUnauthorized: z.boolean(),
		statusCode: z.literal(401),
	})
	.meta({
		ref: "GuestDeleteUnauthorized",
		example: {
			data: null,
			message: "Missing X-Guest-Session header",
			isUnauthorized: true,
			statusCode: 401,
		},
	});

export const guestDeleteForbiddenSchema = z
	.object({
		data: z.null(),
		message: z.string(),
		isForbidden: z.boolean(),
		statusCode: z.literal(403),
	})
	.meta({
		ref: "GuestDeleteForbidden",
		example: {
			data: null,
			message: "Forbidden: X-Guest-Session does not match task owner",
			isForbidden: true,
			statusCode: 403,
		},
	});

export const guestDeleteNotFoundSchema = z
	.object({
		data: z.null(),
		message: z.string(),
		notFound: z.boolean(),
		statusCode: z.literal(404),
	})
	.meta({
		ref: "GuestDeleteNotFound",
		example: {
			data: null,
			message: "Task not found",
			notFound: true,
			statusCode: 404,
		},
	});

export const guestDeleteConflictSchema = z
	.object({
		data: z.null(),
		message: z.string(),
		isClientError: z.boolean(),
		statusCode: z.literal(409),
	})
	.meta({
		ref: "GuestDeleteConflict",
		example: {
			data: null,
			message: "Conflict: Task cannot be deleted because it is not OPEN",
			isClientError: true,
			statusCode: 409,
		},
	});

// ...existing code...
export const guestTaskSuccessSchema = z
	.object({
		data: z.object({
			id: z.string().uuid(),
			title: z.string(),
			urgency: z.string(),
			status: z.string(),
			audioUrl: z.string().url().nullable(),
		}),
		message: z.string(),
		statusCode: z.number(),
	})
	.meta({
		ref: "GuestTaskResponse",
		example: {
			data: {
				id: "550e8400-e29b-41d4-a716-446655440000",
				title: "Ajutor transport clinica",
				urgency: "CRITICAL",
				status: "OPEN",
				audioUrl: "https://r2.com/audio-file.mp3",
			},
			message: "Request completed successfully",
			statusCode: 201,
		},
	});

export const guestTaskIdParamSchema = z.object({
	id: z.coerce
		.number()
		.int()
		.positive("Task id must be a positive integer"),
});
