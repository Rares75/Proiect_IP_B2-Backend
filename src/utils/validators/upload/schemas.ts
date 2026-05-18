import type { OpenAPIV3_1 } from "openapi-types";
import z from "zod";

export const fileUploadFormSchema = z.object({
	file: z.instanceof(File, { message: "Must be a File" }),
});

export const uploadSuccessResponseSchema = z
	.object({
		data: z.string(),
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
		ref: "UploadSuccessResponse",
		example: {
			data: "https://cdn.example.com/uploads/avatar.png",
			message: "Request completed successfully",
			notFound: false,
			isUnauthorized: false,
			isServerError: false,
			isClientError: false,
			app: { url: "http://localhost:3000" },
			statusCode: 200,
		},
	});

export const uploadErrorResponseSchema = z
	.object({
		data: z.null(),
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
		ref: "UploadErrorResponse",
		example: {
			data: null,
			message: "Internal server error",
			notFound: false,
			isUnauthorized: false,
			isServerError: true,
			isClientError: false,
			app: { url: "http://localhost:3000" },
			statusCode: 500,
		},
	});

export const fileUploadRequestBody: OpenAPIV3_1.RequestBodyObject = {
	required: true,
	content: {
		"multipart/form-data": {
			schema: {
				type: "object",
				required: ["file"],
				properties: {
					file: {
						type: "string",
						format: "binary",
						description: "File to upload",
					},
				},
			},
		},
	},
};
