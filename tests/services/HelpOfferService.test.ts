import { describe, expect, it } from "bun:test";
import {
	HelpOfferDuplicatePendingError,
	HelpOfferForbiddenError,
	HelpOfferService,
	HelpOfferTaskNotFoundError,
	HelpOfferTaskStatusConflictError,
} from "../../src/services/HelpOfferService";

describe("HelpOfferService.createOffer", () => {
	it("creates a pending offer for a volunteer on an OPEN task", async () => {
		const service = new HelpOfferService(
			{
				findById: async () => ({
					id: 1,
					status: "OPEN",
					requestedByUserId: "owner-1",
				}),
			} as any,
			{
				findPendingByHelpRequestIdAndVolunteerId: async () => undefined,
				create: async (payload: any) => ({
					id: 10,
					...payload,
					status: "PENDING",
					createdAt: new Date("2026-05-04T12:00:00.000Z"),
				}),
			} as any,
			{
				findByUserId: async () => ({ id: 7, userId: "volunteer-user" }),
			} as any,
		);

		const created = await service.createOffer(1, "volunteer-user", {
			message: "",
		});

		expect(created).toMatchObject({
			id: 10,
			helpRequestId: 1,
			volunteerId: 7,
			message: "",
			status: "PENDING",
		});
	});

	it("throws not found when task does not exist", async () => {
		const service = new HelpOfferService(
			{
				findById: async () => undefined,
			} as any,
			{} as any,
			{} as any,
		);

		await expect(
			service.createOffer(999, "volunteer-user", {}),
		).rejects.toBeInstanceOf(HelpOfferTaskNotFoundError);
	});

	it("throws conflict when task is not OPEN", async () => {
		const service = new HelpOfferService(
			{
				findById: async () => ({
					id: 1,
					status: "MATCHED",
					requestedByUserId: "owner-1",
				}),
			} as any,
			{} as any,
			{} as any,
		);

		await expect(
			service.createOffer(1, "volunteer-user", {}),
		).rejects.toBeInstanceOf(HelpOfferTaskStatusConflictError);
	});

	it("throws forbidden when user is not a volunteer", async () => {
		const service = new HelpOfferService(
			{
				findById: async () => ({
					id: 1,
					status: "OPEN",
					requestedByUserId: "owner-1",
				}),
			} as any,
			{} as any,
			{
				findByUserId: async () => undefined,
			} as any,
		);

		await expect(
			service.createOffer(1, "plain-user", {}),
		).rejects.toBeInstanceOf(HelpOfferForbiddenError);
	});

	it("throws forbidden when volunteer tries to offer on their own task", async () => {
		const service = new HelpOfferService(
			{
				findById: async () => ({
					id: 1,
					status: "OPEN",
					requestedByUserId: "owner-1",
				}),
			} as any,
			{} as any,
			{
				findByUserId: async () => ({ id: 7, userId: "owner-1" }),
			} as any,
		);

		await expect(service.createOffer(1, "owner-1", {})).rejects.toBeInstanceOf(
			HelpOfferForbiddenError,
		);
	});

	it("throws conflict when the same volunteer already has a pending offer", async () => {
		const service = new HelpOfferService(
			{
				findById: async () => ({
					id: 1,
					status: "OPEN",
					requestedByUserId: "owner-1",
				}),
			} as any,
			{
				findPendingByHelpRequestIdAndVolunteerId: async () => ({
					id: 5,
					helpRequestId: 1,
					volunteerId: 7,
					status: "PENDING",
				}),
			} as any,
			{
				findByUserId: async () => ({ id: 7, userId: "volunteer-user" }),
			} as any,
		);

		await expect(
			service.createOffer(1, "volunteer-user", {}),
		).rejects.toBeInstanceOf(HelpOfferDuplicatePendingError);
	});
});
