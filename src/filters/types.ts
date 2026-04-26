export type TaskDistanceFilterParams = {
	lat: number;
	lng: number;
	radiusKm?: number;
};

export type TaskFilterParams = {
	distance?: TaskDistanceFilterParams;
};
