import { Hono } from "hono";
import { Controller } from "../utils/controller";
import { S3Sservice } from "../services/S3Service";
import { inject } from "../di";
import { describeRoute, resolver, validator as zValidator } from "hono-openapi";
import type { OpenAPIV3_1 } from "openapi-types";
import z from "zod";
import { sendApiResponse } from "../utils/apiReponse";
import { logger } from "../utils/logger";

const fileSschema = z.object({
	file: z.instanceof(File, { message: "Must be a File" }),
});

const uploadSuccessResponseSchema = z
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

const uploadErrorResponseSchema = z
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

const fileUploadRequestBody: OpenAPIV3_1.RequestBodyObject = {
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

@Controller("/uploads")
export class UploadController {
	constructor(@inject(S3Sservice) private readonly s3Service: S3Sservice) {}
	controller = new Hono()
		.post(
			"/avatar",
			describeRoute({
				tags: ["Uploads"],
				summary: "Upload avatar",
				description: "Uploads a user avatar and returns its public URL.",
				requestBody: fileUploadRequestBody,
				responses: {
					200: {
						description: "Avatar uploaded successfully",
						content: {
							"application/json": {
								schema: resolver(uploadSuccessResponseSchema),
							},
						},
					},
					400: {
						description: "Invalid upload request",
						content: {
							"application/json": {
								schema: resolver(uploadErrorResponseSchema),
							},
						},
					},
					500: {
						description: "Internal server error",
						content: {
							"application/json": {
								schema: resolver(uploadErrorResponseSchema),
							},
						},
					},
				},
			}),
			zValidator("form", fileSschema),
			async (c) => {
				const { file } = c.req.valid("form");
				try {
					const url = await this.s3Service.uploadAvatar(file);

					return sendApiResponse(c, url, { kind: "success" });
				} catch (error) {
					logger.exception(error);
					return sendApiResponse(c, null, { kind: "serverError" });
				}
			},
		)
		.post(
			"/image",
			describeRoute({
				tags: ["Uploads"],
				summary: "Upload image",
				description:
					"Uploads an image used in tasks or messages and returns its public URL.",
				requestBody: fileUploadRequestBody,
				responses: {
					200: {
						description: "Image uploaded successfully",
						content: {
							"application/json": {
								schema: resolver(uploadSuccessResponseSchema),
							},
						},
					},
					400: {
						description: "Invalid upload request",
						content: {
							"application/json": {
								schema: resolver(uploadErrorResponseSchema),
							},
						},
					},
					500: {
						description: "Internal server error",
						content: {
							"application/json": {
								schema: resolver(uploadErrorResponseSchema),
							},
						},
					},
				},
			}),
			zValidator("form", fileSschema),
			async (c) => {
				const { file } = c.req.valid("form");
				try {
					const url = await this.s3Service.uploadImage(file);
					return sendApiResponse(c, url, { kind: "success" });
				} catch (error) {
					logger.exception(error);
					return sendApiResponse(c, null, { kind: "serverError" });
				}
			},
		)
		.post(
			"/audio",
			describeRoute({
				tags: ["Uploads"],
				summary: "Upload audio",
				description: "Uploads an audio file and returns its public URL.",
				requestBody: fileUploadRequestBody,
				responses: {
					200: {
						description: "Audio uploaded successfully",
						content: {
							"application/json": {
								schema: resolver(uploadSuccessResponseSchema),
							},
						},
					},
					400: {
						description: "Invalid upload request",
						content: {
							"application/json": {
								schema: resolver(uploadErrorResponseSchema),
							},
						},
					},
					500: {
						description: "Internal server error",
						content: {
							"application/json": {
								schema: resolver(uploadErrorResponseSchema),
							},
						},
					},
				},
			}),
			zValidator("form", fileSschema),
			async (c) => {
				const { file } = c.req.valid("form");
				try {
					const url = await this.s3Service.uploadAudioFile(file);
					return sendApiResponse(c, url, { kind: "success" });
				} catch (error) {
					logger.exception(error);
					return sendApiResponse(c, null, { kind: "serverError" });
				}
			},
		);
}
