import { Hono } from "hono";
import { Controller } from "../utils/controller";
import { S3Sservice } from "../services/S3Service";
import { inject } from "../di";
import { validator as zValidator } from "hono-openapi";
import {
	uploadAudioDocs,
	uploadAvatarDocs,
	uploadImageDocs,
} from "../docs/upload.docs";
import { sendApiResponse } from "../utils/apiReponse";
import { logger } from "../utils/logger";
import { fileUploadFormSchema } from "../utils/validators/upload/schemas";

@Controller("/uploads")
export class UploadController {
	constructor(@inject(S3Sservice) private readonly s3Service: S3Sservice) {}
	controller = new Hono()
		.post(
			"/avatar",
			uploadAvatarDocs,
			zValidator("form", fileUploadFormSchema),
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
			uploadImageDocs,
			zValidator("form", fileUploadFormSchema),
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
			uploadAudioDocs,
			zValidator("form", fileUploadFormSchema),
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
