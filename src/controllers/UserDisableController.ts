import { Hono } from "hono";
import { Controller } from "../utils/controller";
import { inject } from "../di";
import { authMiddleware } from "../middlware/authMiddleware";
import { UserDisableService } from "../services/UserDisableService";
import { validator as zValidator } from "hono-openapi";
import { z } from "zod";

// ─── Validation schemas ──────────────────────────────────────────────────────

const disableUserSchema = z.object({
	userId: z.string().min(1, "userId is required"),
	reason: z.string().min(3, "reason must be at least 3 characters"),
	status: z.enum(["BLOCKED", "LIMITED"]).optional().default("BLOCKED"),
});

const userIdParamSchema = z.object({
	userId: z.string().min(1),
});

// ─── Controller ──────────────────────────────────────────────────────────────

@Controller("/users")
export class UserDisableController {
	constructor(
		@inject(UserDisableService)
		private readonly userDisableService: UserDisableService,
	) {}

	controller = new Hono()

		/**
		 * POST /users/disable
		 * Disables a user account and sends a notification email.
		 *
		 * Body: { userId, reason, status? }
		 * Requires auth (admin action).
		 */
		.post(
			"/disable",
			authMiddleware,
			zValidator("json", disableUserSchema),
			async (c) => {
				const { userId, reason, status } = c.req.valid("json");

				const result = await this.userDisableService.disableUser({
					userId,
					reason,
					status,
				});

				if (!result.success) {
					return c.json(
						{
							success: false,
							message: result.message,
						},
						400,
					);
				}

				return c.json(
					{
						success: true,
						alreadyDisabled: result.alreadyDisabled,
						notificationSent: result.notificationSent,
						message: result.message,
					},
					200,
				);
			},
		)

		/**
		 * GET /users/:userId/disable-history
		 * Returns the full disable notification log for a user.
		 */
		.get(
			"/:userId/disable-history",
			authMiddleware,
			zValidator("param", userIdParamSchema),
			async (c) => {
				const { userId } = c.req.valid("param");

				const history =
					await this.userDisableService.getDisableHistory(userId);

				return c.json(
					{
						success: true,
						userId,
						history,
					},
					200,
				);
			},
		)

		/**
		 * GET /users/:userId/disable-history/latest
		 * Returns the most recent disable notification for a user.
		 */
		.get(
			"/:userId/disable-history/latest",
			authMiddleware,
			zValidator("param", userIdParamSchema),
			async (c) => {
				const { userId } = c.req.valid("param");

				const latest =
					await this.userDisableService.getLatestDisableNotification(userId);

				if (!latest) {
					return c.json(
						{
							success: false,
							message: "No disable notification found for this user",
						},
						404,
					);
				}

				return c.json(
					{
						success: true,
						notification: latest,
					},
					200,
				);
			},
		);
}