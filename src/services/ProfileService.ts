import { ProfileRepository } from "../db/repositories/profile.repository";
import { db } from "../db";
import { user } from "../db/schema";
import { eq } from "drizzle-orm";
import { Service } from "../di/decorators/service";
import type {
	CreateProfileType,
	UpdateProfileType,
} from "../utils/validators/profileValidator";
import { inject } from "../di";
import { logger } from "../utils/logger";
import { NotFoundError } from "../utils/Errors";

@Service()
export class ProfileService {
	constructor(
		@inject(ProfileRepository) private readonly profileRepo: ProfileRepository,
	) {}

	async createProfile(userId: string, data: CreateProfileType) {
		const existing = await this.profileRepo.findFirstBy({ userId });
		if (existing) throw new Error("Profile already exists");

		await db
			.update(user)
			.set({
				name: data.name,
				image: data.image,
			})
			.where(eq(user.id, userId));

		const created = await this.profileRepo.create({
			userId,
			bio: data.bio,
			languages: data.languages,
			hiddenIdentity: data.hiddenIdentity,
		});

		return created;
	}

	async getProfileByUserId(userId: string) {
		const profile = await this.profileRepo.findFirstBy({ userId });
		if (!profile) {
			logger.error(`Profile for user '${userId}' not found`);
			throw new NotFoundError("Profile", userId);
		}
		return profile;
	}

	async getProfileById(id: number) {
		const profile = await this.profileRepo.findById(id);
		if (!profile) {
			logger.error(`Profile with id '${id}' not found`);
			throw new NotFoundError("Profile", String(id));
		}
		return profile;
	}

	async updateProfile(userId: string, data: UpdateProfileType) {
		const existing = await this.profileRepo.findFirstBy({ userId });
		if (!existing) {
			logger.error(`Profile for user '${userId}' not found`);
			throw new NotFoundError("Profile", userId);
		}

		if (data.name || data.image) {
			await db
				.update(user)
				.set({
					name: data.name,
					image: data.image,
				})
				.where(eq(user.id, userId));
		}

		const updated = await this.profileRepo.update(existing.id, {
			bio: data.bio,
			languages: data.languages,
			hiddenIdentity: data.hiddenIdentity,
		});

		return updated;
	}

	async deleteProfile(userId: string) {
		const existing = await this.profileRepo.findFirstBy({ userId });
		if (!existing) {
			logger.error(`Profile for user '${userId}' not found`);
			throw new NotFoundError("Profile", userId);
		}
		return await this.profileRepo.delete(existing.id);
	}
}
