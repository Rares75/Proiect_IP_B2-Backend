import { Service } from "../di/decorators/service";
import { inject } from "../di";
import {
	VolunteerRepository,
	type VolunteerKnownLocationInput,
	type VolunteerLocationPoint,
} from "../db/repositories/volunteer.repository";
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

	private hasOwnProperty<T extends object>(
		object: T,
		property: PropertyKey,
	): boolean {
		return Object.prototype.hasOwnProperty.call(object, property);
	}

	async getVolunteer(userId: string) {
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
		if (!profile) {
			return { volunteer, profile: null };
		}

		const knownLocations =
			await this.volunteerRepo.findKnownLocationsByVolunteerId(volunteer.id);

		return {
			volunteer,
			profile: {
				...profile,
				knownLocations,
			},
		};
	}

	async createVolunteerProfile(
		userId: string,
		data: {
			skills?: string[];
			maxDistanceKm?: number | null;
			currentLocation?: VolunteerLocationPoint | null;
			knownLocations?: VolunteerKnownLocationInput[];
			availability?: boolean;
		},
	) {
		const volunteer = await this.getVolunteer(userId);

		if (data.availability !== undefined) {
			await this.volunteerRepo.update(volunteer.id, {
				availability: data.availability,
			});
		}

		const existing = await this.volunteerProfileRepo.findByVolunteerId(
			volunteer.id,
		);
		if (existing) throw new Error("Volunteer profile already exists");

		const created = await this.volunteerProfileRepo.create({
			volunteerId: volunteer.id,
			skills: data.skills ?? [],
			maxDistanceKm: data.maxDistanceKm,
			currentLocation: data.currentLocation,
		});

		if (data.knownLocations !== undefined) {
			await this.volunteerRepo.replaceKnownLocations(
				volunteer.id,
				data.knownLocations,
			);
		}

		return created;
	}

	async updateVolunteerProfile(
		userId: string,
		data: {
			skills?: string[];
			maxDistanceKm?: number | null;
			currentLocation?: VolunteerLocationPoint | null;
			knownLocations?: VolunteerKnownLocationInput[];
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

		const updateData: {
			skills?: string[];
			maxDistanceKm?: number | null;
			currentLocation?: VolunteerLocationPoint | null;
		} = {};

		if (this.hasOwnProperty(data, "skills")) {
			updateData.skills = data.skills;
		}
		if (this.hasOwnProperty(data, "maxDistanceKm")) {
			updateData.maxDistanceKm = data.maxDistanceKm ?? null;
		}
		if (this.hasOwnProperty(data, "currentLocation")) {
			updateData.currentLocation = data.currentLocation ?? null;
		}

		const updated = await this.volunteerProfileRepo.update(profile.id, {
			...updateData,
		});

		if (data.knownLocations !== undefined) {
			await this.volunteerRepo.replaceKnownLocations(
				volunteer.id,
				data.knownLocations,
			);
		}

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
