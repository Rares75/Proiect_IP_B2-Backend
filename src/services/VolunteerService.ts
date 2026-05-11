import { Service } from "../di/decorators/service";
import { inject } from "../di";
import { VolunteerRepository } from "../db/repositories/volunteer.repository";
import { VolunteerProfileRepository } from "../db/repositories/volunteerProfile.repository";
import { NotFoundError } from "../utils/Errors";

@Service()
export class VolunteerService {
	constructor(
		@inject(VolunteerRepository)
		private readonly volunteerRepo: VolunteerRepository,
		@inject(VolunteerProfileRepository)
		private readonly volunteerProfileRepo: VolunteerProfileRepository,
	) {}

	async getOrCreateVolunteer(userId: string) {
		let volunteer = await this.volunteerRepo.findByUserId(userId);
		if (!volunteer) {
			volunteer = await this.volunteerRepo.create({ userId });
		}
		return volunteer;
	}

	async getVolunteerProfile(userId: string) {
		const volunteer = await this.volunteerRepo.findByUserId(userId);
		if (!volunteer) throw new NotFoundError("Volunteer", userId);

		const profile = await this.volunteerProfileRepo.findByVolunteerId(
			volunteer.id,
		);
		return { volunteer, profile: profile ?? null };
	}

	async createVolunteerProfile(
		userId: string,
		data: {
			skills?: string[];
			maxDistanceKm?: number;
		},
	) {
		const volunteer = await this.getOrCreateVolunteer(userId);

		const existing = await this.volunteerProfileRepo.findByVolunteerId(
			volunteer.id,
		);
		if (existing) throw new Error("Volunteer profile already exists");

		const created = await this.volunteerProfileRepo.create({
			volunteerId: volunteer.id,
			skills: data.skills ?? [],
			maxDistanceKm: data.maxDistanceKm,
		});

		return created;
	}

	async updateVolunteerProfile(
		userId: string,
		data: {
			skills?: string[];
			maxDistanceKm?: number;
			availability?: boolean;
		},
	) {
		const volunteer = await this.volunteerRepo.findByUserId(userId);
		if (!volunteer) throw new NotFoundError("Volunteer", userId);

		if (data.availability !== undefined) {
			await this.volunteerRepo.update(volunteer.id, {
				availability: data.availability,
			});
		}

		const profile = await this.volunteerProfileRepo.findByVolunteerId(
			volunteer.id,
		);
		if (!profile)
			throw new NotFoundError("VolunteerProfile", String(volunteer.id));

		const updated = await this.volunteerProfileRepo.update(profile.id, {
			skills: data.skills,
			maxDistanceKm: data.maxDistanceKm,
		});

		return updated;
	}

	async addSkill(userId: string, skill: string) {
		const volunteer = await this.volunteerRepo.findByUserId(userId);
		if (!volunteer) throw new NotFoundError("Volunteer", userId);

		const profile = await this.volunteerProfileRepo.findByVolunteerId(
			volunteer.id,
		);
		if (!profile)
			throw new NotFoundError("VolunteerProfile", String(volunteer.id));

		const skills = profile.skills ?? [];
		if (skills.includes(skill)) throw new Error("Skill already exists");

		return await this.volunteerProfileRepo.update(profile.id, {
			skills: [...skills, skill],
		});
	}

	async removeSkill(userId: string, skill: string) {
		const volunteer = await this.volunteerRepo.findByUserId(userId);
		if (!volunteer) throw new NotFoundError("Volunteer", userId);

		const profile = await this.volunteerProfileRepo.findByVolunteerId(
			volunteer.id,
		);
		if (!profile)
			throw new NotFoundError("VolunteerProfile", String(volunteer.id));

		const skills = profile.skills ?? [];
		if (!skills.includes(skill)) throw new Error("Skill not found");

		return await this.volunteerProfileRepo.update(profile.id, {
			skills: skills.filter((s) => s !== skill),
		});
	}
}
