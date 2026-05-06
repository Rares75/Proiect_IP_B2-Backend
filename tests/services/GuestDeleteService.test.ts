import { describe, it, expect, beforeEach, vi } from "bun:test";
import { HelpRequestService } from "../../src/services/HelpRequestService";
import {
	ConflictError,
	ForbiddenError,
	NotFoundError,
} from "../../src/utils/Errors";

describe("HelpRequestService - deleteGuestHelpRequest", () => {
	let service: HelpRequestService;
	let mockHelpRequestRepo: {
		findById: ReturnType<typeof vi.fn>;
		delete: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		mockHelpRequestRepo = {
			findById: vi.fn(),
			delete: vi.fn(),
		};

		service = new HelpRequestService(
			mockHelpRequestRepo as any,
			{} as any,
			{} as any,
			{} as any,
			{ scanContent: vi.fn(() => ({ level: "CLEAN" })) } as any,
		);
	});

	describe("Business rules", () => {
		const validSession = "session-123";

		it("throws NotFoundError when the task does not exist", async () => {
			mockHelpRequestRepo.findById.mockResolvedValue(undefined);

			await expect(
				service.deleteGuestHelpRequest(validSession, 99),
			).rejects.toThrow(NotFoundError);
			expect(mockHelpRequestRepo.delete).not.toHaveBeenCalled();
		});

		it("throws ForbiddenError when guestSessionId does not match", async () => {
			mockHelpRequestRepo.findById.mockResolvedValue({
				id: 1,
				guestSessionId: "other-session",
				status: "OPEN",
			});

			await expect(
				service.deleteGuestHelpRequest(validSession, 1),
			).rejects.toThrow(ForbiddenError);
			expect(mockHelpRequestRepo.delete).not.toHaveBeenCalled();
		});

		it("throws ConflictError when status is MATCHED", async () => {
			mockHelpRequestRepo.findById.mockResolvedValue({
				id: 1,
				guestSessionId: validSession,
				status: "MATCHED",
			});

			await expect(
				service.deleteGuestHelpRequest(validSession, 1),
			).rejects.toThrow(ConflictError);
			expect(mockHelpRequestRepo.delete).not.toHaveBeenCalled();
		});

		it("throws ConflictError when status is COMPLETED", async () => {
			mockHelpRequestRepo.findById.mockResolvedValue({
				id: 1,
				guestSessionId: validSession,
				status: "COMPLETED",
			});

			await expect(
				service.deleteGuestHelpRequest(validSession, 1),
			).rejects.toThrow(ConflictError);
			expect(mockHelpRequestRepo.delete).not.toHaveBeenCalled();
		});

		it("deletes the task when the session matches and status is OPEN", async () => {
			mockHelpRequestRepo.findById.mockResolvedValue({
				id: 1,
				guestSessionId: validSession,
				status: "OPEN",
			});
			mockHelpRequestRepo.delete.mockResolvedValue(undefined);

			await expect(
				service.deleteGuestHelpRequest(validSession, 1),
			).resolves.toBeUndefined();
			expect(mockHelpRequestRepo.delete).toHaveBeenCalledTimes(1);
			expect(mockHelpRequestRepo.delete).toHaveBeenCalledWith(1);
		});
	});
});
