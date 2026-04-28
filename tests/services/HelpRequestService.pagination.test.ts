import { describe, expect, it, spyOn } from "bun:test";
import { HelpRequestService } from "../../src/services/HelpRequestService";

describe("HelpRequestService.getPaginatedTasks distance defaults", () => {
	it("uses volunteer maxDistanceKm when radius is missing", async () => {
		const helpRequestRepo = {
			findPaginatedWithDetails: spyOn(
				{
					findPaginatedWithDetails: async () => ({
						data: [],
						total: 0,
					}),
				},
				"findPaginatedWithDetails",
			),
		};

		const volunteerRepo = {
			findDistancePreferencesByUserId: async () => ({
				volunteerId: 1,
				maxDistanceKm: 5,
			}),
		};

		const service = new HelpRequestService(
			helpRequestRepo as any,
			{} as any,
			{} as any,
			volunteerRepo as any,
		);

		await service.getPaginatedTasks(
			1,
			10,
			"createdAt",
			"DESC",
			{
				distance: {
					lat: 47.15,
					lng: 27.58,
				},
			},
			"user-123",
		);

		expect(helpRequestRepo.findPaginatedWithDetails).toHaveBeenCalledWith(
			1,
			10,
			"createdAt",
			"DESC",
			{
				distance: {
					lat: 47.15,
					lng: 27.58,
					radiusKm: 5,
				},
			},
		);
	});

	it("throws Radius is required when volunteer has no maxDistanceKm", async () => {
		const service = new HelpRequestService(
			{
				findPaginatedWithDetails: async () => ({
					data: [],
					total: 0,
				}),
			} as any,
			{} as any,
			{} as any,
			{
				findDistancePreferencesByUserId: async () => ({
					volunteerId: 1,
					maxDistanceKm: null,
				}),
			} as any,
		);

		await expect(
			service.getPaginatedTasks(
				1,
				10,
				"createdAt",
				"DESC",
				{
					distance: {
						lat: 47.15,
						lng: 27.58,
					},
				},
				"user-123",
			),
		).rejects.toThrow("Radius is required");
	});
});
