import type { RatingType } from "../db/social";
import { Service } from "../di/decorators/service";
import { RatingException } from "../exceptions/ratings/RatingException";
import { RatingsRepository } from "../db/repositories/ratings.repository";
import type { RatingSummaryType } from "../types";
import { logger } from "../utils/logger";
import { inject } from "../di";
import { mapUserIdOnly, type AnonymizedUserDto } from "../utils/anonymizeUser";

export type CreateRatingInput = {
  taskAssignmentId: number;
  writtenByUserId: string;
  receivedByUserId: string;
  stars: number;
  comment: string;
};

export type SafeRatingDto = {
  id: number;
  taskAssignmentId: number;
  stars: number;
  comment: string | null;
  createdAt: Date;
  writtenBy: AnonymizedUserDto;
  receivedBy: AnonymizedUserDto;
};

function mapRatingToSafeDto(rating: RatingType): SafeRatingDto {
  return {
    id: rating.id,
    taskAssignmentId: rating.taskAssignmentId,
    stars: rating.stars,
    comment: rating.comment,
    createdAt: rating.createdAt,
    writtenBy: mapUserIdOnly(rating.writtenByUserId),
    receivedBy: mapUserIdOnly(rating.receivedByUserId),
  };
}

@Service()
export class RatingsService {
  constructor(
    @inject(RatingsRepository)
    private readonly ratingRepo: RatingsRepository,
  ) {}

  async createRating(input: CreateRatingInput): Promise<SafeRatingDto | null> {
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

      return createdRating ? mapRatingToSafeDto(createdRating) : null;
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

  async getRatingsForUser(userId: string): Promise<SafeRatingDto[] | null> {
    try {
      if (!userId) {
        logger.exception(
          new RatingException("User ID is required to fetch ratings."),
        );
        return null;
      }

      const ratings = await this.ratingRepo.getRatingsByReceivedUserId(userId);
      return ratings.map(mapRatingToSafeDto);
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

  async getRecentRatingsForUser(
    userId: string,
  ): Promise<SafeRatingDto[] | null> {
    try {
      if (!userId) {
        logger.exception(
          new RatingException("User ID is required to fetch recent ratings."),
        );
        return null;
      }

      const ratings =
        await this.ratingRepo.getRecentRatingsByReceivedUserId(userId);

      return ratings.map(mapRatingToSafeDto);
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
