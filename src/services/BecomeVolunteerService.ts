import { inject } from "../di";
import { Service } from "../di/decorators/service";
import { db } from "../db";
import { user, volunteers } from "../db/schema";
import { eq } from "drizzle-orm";
import { VolunteerRepository } from "../db/repositories/volunteer.repository";
import { UserRepository } from "../db/repositories/user.repository";
import { NotFoundError } from "../utils/Errors";
import { logger } from "../utils/logger";
@Service()
export class BecomeVolunteerService {
	constructor(
		@inject(VolunteerRepository)
		private readonly volunteerRepository: VolunteerRepository,
		@inject(UserRepository)
		private readonly userRepository: UserRepository,
	) {}

	/**
	 * Upgrades a user's role to volunteer.
	 * Creates a volunteer record and updates the user's role.
	 * @param userId - the ID of the user requesting to become a volunteer
	 * @returns the newly created volunteer record
	 * @throws NotFoundError if the user does not exist
	 * @throws Error if the user is already a volunteer
	 */
	async becomeVolunteer(userId: string) {
		const existingUser = await this.userRepository.findById(userId);
		if (!existingUser) {
			logger.error(`User '${userId}' not found`);
			throw new NotFoundError("User", userId);
		}

		const existingVolunteer =
			await this.volunteerRepository.findByUserId(userId);
		if (existingVolunteer) {
			logger.error(`User '${userId}' is already a volunteer`);
			throw new Error("User is already a volunteer");
		}

		return await db.transaction(async (tx) => {
			const [volunteer] = await tx
				.insert(volunteers)
				.values({ userId })
				.returning();

			await tx
				.update(user)
				.set({ role: "volunteer" })
				.where(eq(user.id, userId));

			logger.info(`User '${userId}' successfully became a volunteer`);
			return volunteer;
		});
	}
}
