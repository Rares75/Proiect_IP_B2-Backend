import { AccountRepository } from "../db/repositories/account.repository";
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
		@inject(AccountRepository) private readonly accountRepo: AccountRepository,
	) {}

	/**
	 *
	 * @param userId
	 * @returns True if ban was successful, false otherwise
	 */
	async banUser(userId: string, banReson: string): Promise<boolean> {
		const user = await this.userRepo.findById(userId);
		const userAccount = await this.accountRepo.findFirstBy({ userId });
		if (!user || !userAccount) {
			logger.exception(
				new UserManagementException("User or account not found"),
			);
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

		const updatedAccount = await this.accountRepo.update(userAccount.id, {
			status: "BLOCKED",
			banned_at: new Date(),
			bannedReason: banReson,
		});

		if (!updatedAccount) {
			logger.exception(
				new UserManagementException(
					"Failed to update account status to BLOCKED",
				),
			);
			return false;
		}

		return true;
	}
}
