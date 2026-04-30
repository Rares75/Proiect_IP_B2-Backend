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

@Controller("/profile")
export class ProfileController {
	constructor(
		@inject(ProfileService) private readonly profileService: ProfileService,
	) {}
	controller = new Hono()

		.get("/:userId", async (c, next) => {
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
		})
		.use(authMiddlware)


		.post("/", async (c) => {
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
		})

		.put("/me", async (c) => {
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
		})

		.delete("/me", async (c) => {
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
		});
}
