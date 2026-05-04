import type { VolunteerRepository } from "../db/repositories/volunteer.repository";
import type { TaskFilterParams } from "../filters";

export class RadiusRequiredError extends Error {
	constructor() {
		super("Radius is required");
		this.name = "RadiusRequiredError";
	}
}

export const resolveTaskDistanceFilter = async (
	filters: TaskFilterParams | undefined,
	userId: string | undefined,
	volunteerRepo: VolunteerRepository,
): Promise<TaskFilterParams | undefined> => {
	if (!filters?.distance || filters.distance.radiusKm !== undefined) {
		return filters;
	}

	if (!userId) {
		throw new RadiusRequiredError();
	}

	const volunteerProfile =
		await volunteerRepo.findDistancePreferencesByUserId(userId);

	if (
		typeof volunteerProfile?.maxDistanceKm !== "number" ||
		volunteerProfile.maxDistanceKm <= 0
	) {
		throw new RadiusRequiredError();
	}

	return {
		...filters,
		distance: {
			...filters.distance,
			radiusKm: volunteerProfile.maxDistanceKm,
		},
	};
};
