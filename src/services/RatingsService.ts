import type { RatingType } from "../db/social";
import { Service } from "../di/decorators/service";
import { RatingException } from "../exceptions/ratings/RatingException";
import { RatingsRepository } from "../db/repositories/ratings.repository";
import type { RatingSummaryType } from "../types";
import { logger } from "../utils/logger";
import { inject } from "../di";
export type CreateRatingInput = {
	taskAssignmentId: number;
	writtenByUserId: string;
	receivedByUserId: string;
	stars: number;
	comment: string;
};

@Service()
export class RatingsService {
	constructor(
		@inject(RatingsRepository)
		private readonly ratingRepo: RatingsRepository,
	) {}

	async createRating(input: CreateRatingInput): Promise<RatingType | null> {
		try {
			const {
				taskAssignmentId,
				writtenByUserId,
				receivedByUserId,
				stars,
				comment,
			} = input;

			if (writtenByUserId === receivedByUserId) {
				logger.exception(new RatingException("You cannot rate yourself."));
				return null;
			}

			const [taskData] =
				await this.ratingRepo.getTaskAssignmentById(taskAssignmentId);

			if (!taskData) {
				logger.exception(new RatingException("Task assignment not found."));
				return null;
			}

			if (taskData.status !== "COMPLETED") {
				logger.exception(
					new RatingException(
						"Rating can only be given after task completion.",
					),
				);
				return null;
			}

			const [volunteer] = await this.ratingRepo.getVolunteerById(
				taskData.handledByVolunteerId,
			);

			if (!volunteer) {
				logger.exception(new RatingException("Volunteer not found."));
				return null;
			}

			const requesterId = taskData.requestedByUserId;
			const volunteerUserId = volunteer.userId;

			const requesterRatesVolunteer =
				writtenByUserId === requesterId && receivedByUserId === volunteerUserId;
			const volunteerRatesRequester =
				writtenByUserId === volunteerUserId && receivedByUserId === requesterId;

			if (!requesterRatesVolunteer && !volunteerRatesRequester) {
				logger.exception(
					new RatingException("Invalid rating participants for this task."),
				);
				return null;
			}

			const [existingRating] = await this.ratingRepo.findRating(
				taskAssignmentId,
				writtenByUserId,
				receivedByUserId,
			);

			if (existingRating) {
				logger.exception(
					new RatingException("Rating already exists for this task."),
				);
				return null;
			}

			const [createdRating] = await this.ratingRepo.createRating({
				taskAssignmentId,
				writtenByUserId,
				receivedByUserId,
				stars,
				comment: comment.trim(),
			});

			return createdRating ?? null;
		} catch (error) {
			logger.exception(
				new RatingException(
					`Failed to create rating: ${
						error instanceof Error ? error.message : "Unknown error"
					}`,
				),
			);
			return null;
		}
	}

	async getRatingsForUser(userId: string): Promise<RatingType[] | null> {
		try {
			if (!userId) {
				logger.exception(
					new RatingException("User ID is required to fetch ratings."),
				);
				return null;
			}

			return await this.ratingRepo.getRatingsByReceivedUserId(userId);
		} catch (error) {
			logger.exception(
				new RatingException(
					`Failed to fetch ratings for user: ${
						error instanceof Error ? error.message : "Unknown error"
					}`,
				),
			);
			return null;
		}
	}

	async getRatingsSummaryForUser(
		userId: string,
	): Promise<RatingSummaryType | null> {
		try {
			if (!userId) {
				logger.exception(
					new RatingException("User ID is required for ratings summary."),
				);
				return null;
			}

			const ratings = await this.ratingRepo.getRatingsSummaryByUserId(userId);
			return ratings[0] ?? null;
		} catch (error) {
			logger.exception(
				new RatingException(
					`Failed to fetch ratings summary: ${
						error instanceof Error ? error.message : "Unknown error"
					}`,
				),
			);
			return null;
		}
	}

	async getRecentRatingsForUser(userId: string): Promise<RatingType[] | null> {
		try {
			if (!userId) {
				logger.exception(
					new RatingException("User ID is required to fetch recent ratings."),
				);
				return null;
			}

			return await this.ratingRepo.getRecentRatingsByReceivedUserId(userId);
		} catch (error) {
			logger.exception(
				new RatingException(
					`Failed to fetch recent ratings for user: ${
						error instanceof Error ? error.message : "Unknown error"
					}`,
				),
			);
			return null;
		}
	}
}
