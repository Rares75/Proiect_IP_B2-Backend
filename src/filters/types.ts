import type { requestStatusEnum } from "../db/enums";

export type RequestStatus = (typeof requestStatusEnum.enumValues)[number];

export type TaskDistanceFilterParams = {
	lat: number;
	lng: number;
	radiusKm?: number;
};

export type TaskFilterParams = {
	status?: RequestStatus;
	language?: string;
	city?: string;
	skills?: string[];
	distance?: TaskDistanceFilterParams;
	category?: "FACE_TO_FACE" | "MESSAGES_ONLY";
};
