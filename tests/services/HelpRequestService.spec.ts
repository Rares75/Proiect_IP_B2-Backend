import { beforeEach, describe, expect, test } from "bun:test";
import { HelpRequestService } from "../../src/services/HelpRequestService";
import { NotFoundError, ForbiddenError } from "../../src/utils/Errors";

describe("HelpRequestService - deleteHelpRequestByOwner", () => {
	let service: HelpRequestService;
	let mockHelpRequestRepo: any;
	let mockHelpOfferRepo: any;
	let mockVolunteerRepo: any;
	let mockDetailsRepo: any;
	let mockNotificationService: any;
	let mockModerationService: any;

	beforeEach(() => {
		mockHelpRequestRepo = {
			findById: async () => undefined,
			deleteWithOfferRejection: async () => undefined,
		} as any;

		mockHelpOfferRepo = {
			findPendingByHelpRequestId: async () => [],
		} as any;

		mockVolunteerRepo = {} as any;
		mockDetailsRepo = {} as any;

		mockNotificationService = {
			notifyVolunteersPendingOffersCancelled: async () => undefined,
		} as any;

		mockModerationService = {} as any;

		// instantiate with mocks (cast to any to avoid full DI)
		service = new HelpRequestService(
			mockHelpRequestRepo as any,
			mockHelpOfferRepo as any,
			mockVolunteerRepo as any,
			mockDetailsRepo as any,
			mockModerationService as any,
			mockNotificationService as any,
		);
	});

	test("should delete the task and notify volunteers with pending offers", async () => {
		const taskId = 1;
		const userId = "user-123";

		// stub findById to return an OPEN task with title
		mockHelpRequestRepo.findById = async () => ({
			id: taskId,
			requestedByUserId: userId,
			status: "OPEN",
			title: "Task de test",
		});

		// stub helpOfferRepo to return one pending offer
		mockHelpOfferRepo.findPendingByHelpRequestId = async () => [
			{ volunteerUserId: "vol-1" },
		];

		// spy on deleteWithOfferRejection and notification call
		let deleted = false;
		mockHelpRequestRepo.deleteWithOfferRejection = async (
			id: number,
			cb?: (tx: any, pendingOffers: any[]) => Promise<void>,
		) => {
			if (id === taskId) deleted = true;
			const pending = [{ id: 1, volunteerId: 1, volunteerUserId: "vol-1" }];
			// invoke callback to simulate in-transaction notification creation
			if (cb) await cb({}, pending);
			return { deleted: true, pendingOffers: pending };
		};

		let notificationsSent = 0;
		mockNotificationService.notifyVolunteersPendingOffersCancelled = async (
			notifs: any,
			_client?: any,
		) => {
			notificationsSent = notifs.length;
		};

		await service.deleteHelpRequestByOwner(taskId, userId);

		expect(deleted).toBe(true);
		expect(notificationsSent).toBeGreaterThanOrEqual(1);
	});

	test("should throw NotFoundError when task is missing", async () => {
		mockHelpRequestRepo.findById = async () => undefined;

		expect(service.deleteHelpRequestByOwner(999, "user-123")).rejects.toThrow(
			NotFoundError,
		);
	});

	test("should throw ForbiddenError when user is not owner", async () => {
		mockHelpRequestRepo.findById = async () => ({
			id: 1,
			requestedByUserId: "other-user",
			status: "OPEN",
		});

		expect(service.deleteHelpRequestByOwner(1, "user-123")).rejects.toThrow(
			ForbiddenError,
		);
	});
});
