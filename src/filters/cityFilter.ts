import { ilike } from "drizzle-orm";
import { requestLocations } from "../db/requests";
import type { TaskFilterParams } from "./types";

export const parseCityFilter = (city?: string) => {
	// If missing, apply no filter
	if (city === undefined) {
		return { validData: {} };
	}

	const trimmedCity = city.trim();

	// If empty or only spaces after trim, return 400 error
	if (trimmedCity.length === 0) {
		return {
			error: "Error: city requires valid value",
		};
	}
    
	return {
		validData: { city: trimmedCity },
	};
};

export const buildCityFilter = (filters?: TaskFilterParams) => {
	if (!filters?.city) {
		return undefined;
	}

	// ilike performs a case-insensitive comparison
	return ilike(requestLocations.city, filters.city);
};
