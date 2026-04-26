import { UserAccessRepository } from "../db/repositories/userAccess.repository";
import { UserRepository } from "../db/repositories/user.repository";
import { UsermanagementException as UserManagementException } from "../exceptions/user.management/UserManagementException";
import { logger } from "../utils/logger";
import { Service } from "../di/decorators/service";
import { inject } from "../di";
import { RatingsService } from "./RatingsService";

@Service()
export class UserManagementService {
	constructor(
		@inject(RatingsService) private readonly ratingService: RatingsService,
		@inject(UserRepository) private readonly userRepo: UserRepository,
		@inject(UserAccessRepository)
		private readonly userAccessRepo: UserAccessRepository,
	) {}

	/**
	 *
	 * @param userId
	 * @returns True if ban was successful, false otherwise
	 */
	async banUser(userId: string, banReson: string): Promise<boolean> {
		const user = await this.userRepo.findById(userId);
		if (!user) {
			logger.exception(new UserManagementException("User not found"));
			return false;
		}

		const recentRatings =
			await this.ratingService.getRecentRatingsForUser(userId);
		if (!recentRatings) {
			logger.exception(
				new UserManagementException("Failed to fetch user ratings"),
			);
			return false;
		}

		// Requirement: last 5 interactions must all be below 3 stars
		if (recentRatings.length < 5) {
			return false;
		}

		const shouldBan = recentRatings.every((rating) => rating.stars < 3);
		if (!shouldBan) {
			return false;
		}

		logger.info(
			`Banning user ${userId} because last 5 ratings are below 3 stars`,
		);

		const existingAccess = await this.userAccessRepo.findFirstBy({ userId });
		const nextState = {
			status: "BLOCKED" as const,
			bannedAt: new Date(),
			bannedReason: banReson,
		};

		const updatedAccess = existingAccess
			? await this.userAccessRepo.update(existingAccess.id, nextState)
			: await this.userAccessRepo.create({
					userId,
					...nextState,
				});

		if (!updatedAccess) {
			logger.exception(
				new UserManagementException(
					"Failed to update user access status to BLOCKED",
				),
			);
			return false;
		}

		return true;
	}
}
