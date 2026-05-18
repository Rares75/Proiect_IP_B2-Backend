import { describeRoute, resolver } from "hono-openapi";
import {
	fileUploadRequestBody,
	uploadErrorResponseSchema,
	uploadSuccessResponseSchema,
} from "../utils/validators/upload/schemas";

const createUploadDocs = (
	summary: string,
	description: string,
	successDescription: string,
) =>
	describeRoute({
		tags: ["Uploads"],
		summary,
		description,
		requestBody: fileUploadRequestBody,
		responses: {
			200: {
				description: successDescription,
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
	});

export const uploadAvatarDocs = createUploadDocs(
	"Upload avatar",
	"Uploads a user avatar and returns its public URL.",
	"Avatar uploaded successfully",
);

export const uploadImageDocs = createUploadDocs(
	"Upload image",
	"Uploads an image used in tasks or messages and returns its public URL.",
	"Image uploaded successfully",
);

export const uploadAudioDocs = createUploadDocs(
	"Upload audio",
	"Uploads an audio file and returns its public URL.",
	"Audio uploaded successfully",
);
