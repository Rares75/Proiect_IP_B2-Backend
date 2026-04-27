import { UserRepository } from "../db/repositories/user.repository";
import { container } from "../di";
import { logger } from "../utils/logger";

const userRepository = container.get<UserRepository>(UserRepository);
export async function cleanupUnverifiedUsers() {
	const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
	const deleted = await userRepository.deleteUnverifiedOlderThan(oneDayAgo);
	logger.info(`[CLEANUP] Deleted ${deleted} unverified users`);
}
