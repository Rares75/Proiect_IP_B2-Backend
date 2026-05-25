import { container } from "../../../di";
import { ProfileService } from "../../../services/ProfileService";
import { logger } from "../../logger";

export type CreatedUserType = {
	id: string;
	createdAt: Date;
	updatedAt: Date;
	email: string;
	emailVerified: boolean;
	name: string;
	image?: string | null | undefined;
} & Record<string, unknown>;

export async function createUserProfileHook(createdUser: CreatedUserType) {
	try {
		const profileService = container.get<ProfileService>(ProfileService);
		const profile = await profileService.createProfile(createdUser.id, {
			name: createdUser.name,
			image: createdUser.image || "",
		});

		logger.info(
			`Created profile for user ${createdUser.id} with id ${profile.userId}`,
		);
	} catch (error) {
		logger.exception(error);
	}
}
