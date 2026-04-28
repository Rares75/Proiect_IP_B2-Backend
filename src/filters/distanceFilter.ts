import { sql } from "drizzle-orm";
import { requestLocations } from "../db/requests";
import type { TaskDistanceFilterParams, TaskFilterParams } from "./types";

const isFiniteNumber = (value: number) => Number.isFinite(value);

export const parseDistanceFilter = (
	query: Record<string, string | undefined>,
) => {
	const { lat, lng, radius } = query;
	const hasLat = lat !== undefined;
	const hasLng = lng !== undefined;
	const hasRadius = radius !== undefined;

	if (!hasLat && !hasLng && !hasRadius) {
		return { validData: {} satisfies TaskFilterParams };
	}

	if (hasRadius && (!hasLat || !hasLng)) {
		return {
			error:
				"Eroare: 'radius' poate fi folosit doar impreuna cu 'lat' si 'lng'.",
		};
	}

	if (hasLat !== hasLng) {
		return {
			error: "Eroare: 'lat' si 'lng' trebuie trimise impreuna.",
		};
	}

	const parsedLat = Number(lat);
	const parsedLng = Number(lng);

	if (!isFiniteNumber(parsedLat) || parsedLat < -90 || parsedLat > 90) {
		return {
			error: "Eroare: 'lat' trebuie sa fie intre -90 si 90.",
		};
	}

	if (!isFiniteNumber(parsedLng) || parsedLng < -180 || parsedLng > 180) {
		return {
			error: "Eroare: 'lng' trebuie sa fie intre -180 si 180.",
		};
	}

	if (!hasRadius) {
		return {
			validData: {
				distance: {
					lat: parsedLat,
					lng: parsedLng,
				},
			} satisfies TaskFilterParams,
		};
	}

	const parsedRadius = Number(radius);
	if (!isFiniteNumber(parsedRadius) || parsedRadius <= 0) {
		return {
			error: "Eroare: 'radius' trebuie sa fie un numar pozitiv.",
		};
	}

	return {
		validData: {
			distance: {
				lat: parsedLat,
				lng: parsedLng,
				radiusKm: parsedRadius,
			},
		} satisfies TaskFilterParams,
	};
};

const buildDistancePointSql = ({ lat, lng }: TaskDistanceFilterParams) =>
	sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`;

export const buildDistanceFilter = (
	distance: TaskDistanceFilterParams | undefined,
) => {
	if (!distance?.radiusKm) {
		return undefined;
	}

	return sql`ST_DWithin(
		${requestLocations.location}::geography,
		${buildDistancePointSql(distance)},
		${distance.radiusKm * 1000}
	)`;
};

export const buildDistanceOrderBy = (
	distance: TaskDistanceFilterParams | undefined,
) => {
	if (!distance) {
		return undefined;
	}

	return sql`ST_Distance(
		${requestLocations.location}::geography,
		${buildDistancePointSql(distance)}
	)`;
};
