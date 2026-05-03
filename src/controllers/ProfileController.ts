import { Hono } from "hono";
import { Controller } from "../utils/controller";
import {
	createProfileSchema,
	updateProfileSchema,
} from "../utils/validators/profileValidator";
import { authMiddlware } from "../middlware/authMiddleware";
import { sendApiResponse } from "../utils/apiReponse";
import { logger } from "../utils/logger";
import { ProfileService } from "../services/ProfileService";
import { inject } from "../di";
import { NotFoundError } from "../utils/Errors";
import { z } from "zod";
import { describeRoute, resolver } from "hono-openapi";

const profileResponseSchema = z.object({
	userId: z.string(),
	bio: z.string().optional(),
	languages: z.array(z.string()).optional(),
	hiddenIdentity: z.boolean().optional(),
});

const errorResponseSchema = z.object({
	data: z.null(),
	error: z.object({
		kind: z.string(),
		message: z.string().optional(),
	}),
});
@Controller("/profile")
export class ProfileController {
	constructor(
		@inject(ProfileService) private readonly profileService: ProfileService,
	) {}
	controller = new Hono()

		.get(
			"/:userId",
			describeRoute({
				tags: ["User Profile"],
				responses: {
					200: {
						description: "Profile found",
						content: {
							"application/json": {
								schema: resolver(profileResponseSchema),
							},
						},
					},
					404: {
						description: "Profile not found",
						content: {
							"application/json": {
								schema: resolver(errorResponseSchema),
							},
						},
					},
					500: {
						description: "Internal server error",
						content: {
							"application/json": {
								schema: resolver(errorResponseSchema),
							},
						},
					},
				},
			}),
			async (c) => {
				const { userId } = c.req.param();

				try {
					const profile = await this.profileService.getProfileByUserId(userId);
					return sendApiResponse(c, profile);
				} catch (error) {
					if (error instanceof NotFoundError) {
						return sendApiResponse(c, null, { kind: "notFound" });
					}
					logger.exception(error);
					return sendApiResponse(c, null, { kind: "serverError" });
				}
			},
		)
		.use(authMiddlware)

		.post(
			"/",
			describeRoute({
				tags: ["User Profile"],
				responses: {
					201: {
						description: "Profile created successfully",
						content: {
							"application/json": {
								schema: resolver(profileResponseSchema),
							},
						},
					},
					400: {
						description: "Invalid input data",
						content: {
							"application/json": {
								schema: resolver(errorResponseSchema),
							},
						},
					},
					401: {
						description: "Unauthorized - session missing",
						content: {
							"application/json": {
								schema: resolver(errorResponseSchema),
							},
						},
					},
					404: {
						description: "User not found",
						content: {
							"application/json": {
								schema: resolver(errorResponseSchema),
							},
						},
					},
					500: {
						description: "Internal server error",
						content: {
							"application/json": {
								schema: resolver(errorResponseSchema),
							},
						},
					},
				},
			}),
			async (c) => {
				const session = c.get("session");
				if (!session) {
					return sendApiResponse(c, null, { kind: "unauthorized" });
				}

				const body = await c.req.json();
				const parsed = createProfileSchema.safeParse(body);
				if (!parsed.success)
					return sendApiResponse(c, null, {
						kind: "clientError",
						message: "Failed to validate input",
					});

				try {
					const profile = await this.profileService.createProfile(
						session.userId,
						parsed.data,
					);
					return sendApiResponse(c, profile, { kind: "created" });
				} catch (error) {
					if (error instanceof NotFoundError) {
						return sendApiResponse(c, null, { kind: "notFound" });
					}
					logger.exception(error);
					return sendApiResponse(c, null, { kind: "serverError" });
				}
			},
		)

		.put(
			"/me",
			describeRoute({
				tags: ["User Profile"],
				responses: {
					200: {
						description: "Profile updated successfully",
						content: {
							"application/json": {
								schema: resolver(profileResponseSchema),
							},
						},
					},
					400: {
						description: "Invalid input data",
						content: {
							"application/json": {
								schema: resolver(errorResponseSchema),
							},
						},
					},
					401: {
						description: "Unauthorized - session missing",
						content: {
							"application/json": {
								schema: resolver(errorResponseSchema),
							},
						},
					},
					404: {
						description: "Profile not found",
						content: {
							"application/json": {
								schema: resolver(errorResponseSchema),
							},
						},
					},
					500: {
						description: "Internal server error",
						content: {
							"application/json": {
								schema: resolver(errorResponseSchema),
							},
						},
					},
				},
			}),
			async (c) => {
				const session = c.get("session");
				if (!session) {
					return sendApiResponse(c, null, { kind: "unauthorized" });
				}

				const body = await c.req.json();
				const parsed = updateProfileSchema.safeParse(body);
				if (!parsed.success)
					return sendApiResponse(c, null, {
						kind: "clientError",
						message: "Failed to validate input",
					});

				try {
					const updated = await this.profileService.updateProfile(
						session.userId,
						parsed.data,
					);
					return sendApiResponse(c, updated);
				} catch (error) {
					if (error instanceof NotFoundError) {
						return sendApiResponse(c, null, { kind: "notFound" });
					}
					logger.exception(error);
					return sendApiResponse(c, null, { kind: "serverError" });
				}
			},
		)

		.delete(
			"/me",
			describeRoute({
				tags: ["User Profile"],
				responses: {
					200: {
						description: "Profile deleted successfully",
						content: {
							"application/json": {
								schema: resolver(
									z.object({
										deleted: z.boolean(),
									}),
								),
							},
						},
					},
					401: {
						description: "Unauthorized - session missing",
						content: {
							"application/json": {
								schema: resolver(errorResponseSchema),
							},
						},
					},
					404: {
						description: "Profile not found",
						content: {
							"application/json": {
								schema: resolver(errorResponseSchema),
							},
						},
					},
					500: {
						description: "Internal server error",
						content: {
							"application/json": {
								schema: resolver(errorResponseSchema),
							},
						},
					},
				},
			}),
			async (c) => {
				const session = c.get("session");
				if (!session) {
					return sendApiResponse(c, null, { kind: "unauthorized" });
				}

				try {
					await this.profileService.deleteProfile(session.userId);
					return sendApiResponse(
						c,
						{ deleted: true },
						{
							message: "Profile deleted successfully",
						},
					);
				} catch (error) {
					if (error instanceof NotFoundError) {
						return sendApiResponse(c, null, { kind: "notFound" });
					}
					logger.exception(error);
					return sendApiResponse(c, null, { kind: "serverError" });
				}
			},
		);
}
