import {
	type ProfileRepository,
	profileRepository,
} from "../db/repositories/profile.repository";
import { db } from "../db";
import { user } from "../db/schema";
import { eq } from "drizzle-orm";
import type {
	CreateProfileType,
	UpdateProfileType,
} from "../utils/validators/profileValidator";

export class ProfileService {
	private readonly repo: ProfileRepository;

	constructor() {
		this.repo = profileRepository;
	}

	async createProfile(userId: string, data: CreateProfileType) {
		const existing = await this.repo.findFirstBy({ userId });
		if (existing) throw new Error("Profile already exists");

		await db
			.update(user)
			.set({
				name: data.name,
				image: data.image,
			})
			.where(eq(user.id, userId));

		const created = await this.repo.create({
			userId,
			bio: data.bio,
			languages: data.languages,
			hiddenIdentity: data.hiddenIdentity,
		});

		return created;
	}
	async getProfileByUserId(userId: string) {
		const profile = await this.repo.findFirstBy({ userId });
		if (!profile) throw new Error(`Profile for user '${userId}' not found.`);
		return profile;
	}

	async getProfileById(id: number) {
		const profile = await this.repo.findById(id);
		if (!profile) throw new Error(`Profile with id '${id}' not found.`);
		return profile;
	}

	async updateProfile(userId: string, data: UpdateProfileType) {
		const existing = await this.repo.findFirstBy({ userId });
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

		const updated = await this.repo.update(existing.id, {
			bio: data.bio,
			languages: data.languages,
			hiddenIdentity: data.hiddenIdentity,
		});

		return updated;
	}

	async deleteProfile(userId: string) {
		const existing = await this.repo.findFirstBy({ userId });
		if (!existing) throw new Error(`Profile for user '${userId}' not found.`);
		return await this.repo.delete(existing.id);
	}
}
export const profileService = new ProfileService();
