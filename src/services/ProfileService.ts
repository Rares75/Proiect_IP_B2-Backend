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
		if (!profile) throw new Error(`Profile for user '${userId}' not found.`);
		return profile;
	}

	async getProfileById(id: number) {
		const profile = await this.profileRepo.findById(id);
		if (!profile) throw new Error(`Profile with id '${id}' not found.`);
		return profile;
	}

	async updateProfile(userId: string, data: UpdateProfileType) {
		const existing = await this.profileRepo.findFirstBy({ userId });
		if (!existing) throw new Error("Profile not found");

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
		if (!existing) throw new Error(`Profile for user '${userId}' not found.`);
		return await this.profileRepo.delete(existing.id);
	}
}
