import { inject } from "../di";
import { Service } from "../di/decorators/service";
import { UserAccessRepository } from "../db/repositories/userAccess.repository";
import { UserRepository } from "../db/repositories/user.repository";
import { buildAccountDisabledEmail } from "../mailers/templates/account-disabled.template";
import { logger } from "../utils/logger";
import { UsermanagementException as UserManagementException } from "../exceptions/user.management/UserManagementException";
import type { AccountStatusType } from "../types";
import { getMailer } from "../mailers/getMailer";
import { DisableNotificationRepository } from "../db/repositories/disableNotification.repository";

export type DisableReason =
	| "LOW_RATING"
	| "POLICY_VIOLATION"
	| "SUSPICIOUS_ACTIVITY"
	| "MANUAL_REVIEW"
	| string; // allows custom reasons

export interface DisableUserParams {
	userId: string;
	reason: DisableReason;
	/** Defaults to BLOCKED. Use LIMITED for soft restrictions. */
	status?: Extract<AccountStatusType, "BLOCKED" | "LIMITED">;
}

export interface DisableUserResult {
	success: boolean;
	alreadyDisabled: boolean;
	notificationSent: boolean;
	message: string;
}

@Service()
export class UserDisableService {
	constructor(
		@inject(UserAccessRepository)
		private readonly userAccessRepo: UserAccessRepository,

		@inject(UserRepository)
		private readonly userRepo: UserRepository,

		@inject(DisableNotificationRepository)
		private readonly disableNotificationRepo: DisableNotificationRepository,
	) {}

	/**
	 * Disables a user account and sends an email notification.
	 *
	 * Flow:
	 * 1. Validate user exists
	 * 2. Check current status — skip if already in target status
	 * 3. Update userAccess: status, bannedReason, bannedAt, disableReason
	 * 4. Check for duplicate notification (same reason already notified)
	 * 5. Log the disable event in disable_notifications
	 * 6. Send email via mailer
	 */
	async disableUser(params: DisableUserParams): Promise<DisableUserResult> {
		const { userId, reason, status = "BLOCKED" } = params;

		try {
			// 1. Validate user exists
			const user = await this.userRepo.findById(userId);
			if (!user) {
				logger.exception(
					new UserManagementException(
						`[UserDisableService] User not found: ${userId}`,
					),
				);
				return {
					success: false,
					alreadyDisabled: false,
					notificationSent: false,
					message: "User not found",
				};
			}

			// 2. Check current access record
			const userAccess = await this.userAccessRepo.findFirstBy({ userId });

			if (!userAccess) {
				logger.exception(
					new UserManagementException(
						`[UserDisableService] No userAccess record for userId: ${userId}`,
					),
				);
				return {
					success: false,
					alreadyDisabled: false,
					notificationSent: false,
					message: "UserAccess record not found",
				};
			}

			// 3. Guard: already in the target status
			if (userAccess.status === status) {
				logger.info?.(
					`[UserDisableService] User ${userId} is already ${status}. Skipping.`,
				);
				return {
					success: true,
					alreadyDisabled: true,
					notificationSent: false,
					message: `User is already ${status}`,
				};
			}

			const now = new Date();

			// 4. Update userAccess — transition status, store reason and timestamp
			await this.userAccessRepo.update(userAccess.id, {
				status,
				bannedReason: reason,
				bannedAt: now,
			});

			logger.info?.(
				`[UserDisableService] User ${userId} status changed to ${status}. Reason: ${reason}`,
			);

			// 5. Prevent duplicate notifications for the same reason
			const alreadyNotified =
				await this.disableNotificationRepo.notificationExistsForReason(
					userId,
					reason,
				);

			if (alreadyNotified) {
				logger.info?.(
					`[UserDisableService] Duplicate notification skipped for user ${userId}, reason: ${reason}`,
				);
				return {
					success: true,
					alreadyDisabled: false,
					notificationSent: false,
					message: "Status updated. Duplicate notification skipped.",
				};
			}

			// 6. Log disable event
			await this.disableNotificationRepo.create({
				userId,
				reason,
				status,
				notifiedAt: now,
			});

			// 7. Send email notification
			const notificationSent = await this.sendDisableEmail({
				userEmail: user.email,
				userName: user.name,
				reason,
				disabledAt: now,
				status,
			});

			return {
				success: true,
				alreadyDisabled: false,
				notificationSent,
				message: notificationSent
					? "User disabled and notified successfully"
					: "User disabled but email notification failed",
			};
		} catch (error) {
			logger.exception(
				new UserManagementException(
					`[UserDisableService] Failed to disable user ${userId}: ${
						error instanceof Error ? error.message : "Unknown error"
					}`,
				),
			);
			return {
				success: false,
				alreadyDisabled: false,
				notificationSent: false,
				message: "Internal error while disabling user",
			};
		}
	}

	/**
	 * Retrieves the full disable notification history for a user.
	 * Useful for admin panels or audit logs.
	 */
	async getDisableHistory(userId: string) {
		try {
			return await this.disableNotificationRepo.findAllByUserId(userId);
		} catch (error) {
			logger.exception(
				new UserManagementException(
					`[UserDisableService] Failed to fetch disable history for ${userId}: ${
						error instanceof Error ? error.message : "Unknown error"
					}`,
				),
			);
			return [];
		}
	}

	/**
	 * Returns the most recent disable notification for a user.
	 */
	async getLatestDisableNotification(userId: string) {
		try {
			return await this.disableNotificationRepo.findLatestByUserId(userId);
		} catch (error) {
			logger.exception(
				new UserManagementException(
					`[UserDisableService] Failed to fetch latest disable notification for ${userId}: ${
						error instanceof Error ? error.message : "Unknown error"
					}`,
				),
			);
			return undefined;
		}
	}

	// ─── Private helpers ────────────────────────────────────────────────────────

	private async sendDisableEmail(params: {
		userEmail: string;
		userName: string;
		reason: string;
		disabledAt: Date;
		status: "BLOCKED" | "LIMITED";
	}): Promise<boolean> {
		try {
			const { subject, html } = buildAccountDisabledEmail({
				userName: params.userName,
				reason: params.reason,
				disabledAt: params.disabledAt,
				status: params.status,
			});

			const mailer = getMailer();
			await mailer.send({
				to: params.userEmail,
				subject,
				html,
			});

			logger.info?.(
				`[UserDisableService] Disable notification email sent to ${params.userEmail}`,
			);
			return true;
		} catch (error) {
			logger.exception(
				new UserManagementException(
					`[UserDisableService] Email send failed for ${params.userEmail}: ${
						error instanceof Error ? error.message : "Unknown error"
					}`,
				),
			);
			return false;
		}
	}
}