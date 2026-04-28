import { describe, it, expect, beforeEach, vi } from "bun:test";

const { HelpRequestService } = await import(
	"../../src/services/HelpRequestService"
);

/**
 * Unit Tests pentru HelpRequestService
 *
 * Teste pentru:
 * 1. getHelpRequestById cu detalii
 * 2. getHelpRequestById fără detalii
 * 3. getHelpRequestById când task nu există
 * 4. Erori la fetcharea detaliilor
 */

describe("HelpRequestService - getHelpRequestById", () => {
	let service: any;
	let mockHelpRequestRepo: any;
	let mockDetailsRepo: any;
	let mockModerationService: any;
	let mockVolunteerRepo: any;

	beforeEach(() => {
		// Mock repositories
		mockHelpRequestRepo = {
			findById: vi.fn(),
			create: vi.fn(),
		};

		mockDetailsRepo = {
			findByHelpRequestId: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
		};

		mockModerationService = {
			scanContent: vi.fn(),
		};

		mockVolunteerRepo = {
			findDistancePreferencesByUserId: vi.fn(),
		};

		// Instantiate service with mocked dependencies
		service = new HelpRequestService(
			mockHelpRequestRepo,
			mockDetailsRepo,
			mockModerationService,
			mockVolunteerRepo,
		);
	});

	describe("Success Cases with Details", () => {
		it("should return task with populated details when both exist", async () => {
			// Arrange
			const taskId = 1;
			const mockTask = {
				id: 1,
				userId: "user-123",
				guestSessionId: null,
				title: "Cumpar patlajele",
				description: "Cumparaturi",
				urgency: "MEDIUM",
				status: "OPEN",
				anonymousMode: false,
				createdAt: new Date("2025-04-23T10:30:00Z"),
				locationCity: "Iasi",
				locationAddressText: "Carrefour",
				location: null,
			};

			const mockDetails = {
				id: 5,
				helpRequestId: 1,
				notes: "Cumperi o rosie platesti 2",
				languageNeeded: "ro",
				safetyNotes: "Verificare identitate obligatorie",
			};

			mockHelpRequestRepo.findById.mockResolvedValue(mockTask);
			mockDetailsRepo.findByHelpRequestId.mockResolvedValue(mockDetails);

			const result = await service.getHelpRequestById(taskId);
			expect(mockHelpRequestRepo.findById).toHaveBeenCalledWith(taskId);
			expect(mockDetailsRepo.findByHelpRequestId).toHaveBeenCalledWith(taskId);
			expect(result).toEqual({
				...mockTask,
				details: mockDetails,
			});
			expect(result.details).not.toBeNull();
			expect(result.details.helpRequestId).toBe(taskId);
		});

		it("should return task with null details when task exists but details do not", async () => {
			const taskId = 2;
			const mockTask = {
				id: 2,
				userId: "user-456",
				guestSessionId: null,
				title: "Transport la spital",
				description: "Transport pentru consultatie",
				urgency: "HIGH",
				status: "OPEN",
				anonymousMode: true,
				createdAt: new Date("2025-04-23T14:15:00Z"),
				locationCity: "Iasi",
				locationAddressText: "Clinica Dr. X",
				location: null,
			};

			mockHelpRequestRepo.findById.mockResolvedValue(mockTask);
			mockDetailsRepo.findByHelpRequestId.mockResolvedValue(undefined);

			const result = await service.getHelpRequestById(taskId);

			expect(mockHelpRequestRepo.findById).toHaveBeenCalledWith(taskId);
			expect(mockDetailsRepo.findByHelpRequestId).toHaveBeenCalledWith(taskId);
			expect(result).toEqual({
				...mockTask,
				details: null,
			});
			expect(result.details).toBeNull();
		});

		it("should spread all task properties correctly with details", async () => {
			const taskId = 1;
			const mockTask = {
				id: 1,
				userId: "user-123",
				guestSessionId: "session-abc",
				title: "Full task properties test",
				description: "Testing all properties",
				urgency: "HIGH",
				status: "OPEN",
				anonymousMode: true,
				createdAt: new Date("2025-04-23T10:30:00Z"),
				locationCity: "Iasi",
				locationAddressText: "Full address",
				location: { x: 46.9671, y: 28.1667 },
			};

			const mockDetails = {
				id: 1,
				helpRequestId: 1,
				notes: "Notes",
				languageNeeded: "en",
				safetyNotes: "Safety notes",
			};

			mockHelpRequestRepo.findById.mockResolvedValue(mockTask);
			mockDetailsRepo.findByHelpRequestId.mockResolvedValue(mockDetails);

			const result = await service.getHelpRequestById(taskId);

			expect(result.id).toBe(1);
			expect(result.userId).toBe("user-123");
			expect(result.guestSessionId).toBe("session-abc");
			expect(result.title).toBe("Full task properties test");
			expect(result.description).toBe("Testing all properties");
			expect(result.urgency).toBe("HIGH");
			expect(result.status).toBe("OPEN");
			expect(result.anonymousMode).toBe(true);
			expect(result.createdAt).toEqual(new Date("2025-04-23T10:30:00Z"));
			expect(result.locationCity).toBe("Iasi");
			expect(result.locationAddressText).toBe("Full address");
			expect(result.location).toEqual({ x: 46.9671, y: 28.1667 });
			expect(result.details).toEqual(mockDetails);
		});
	});

	describe("Not Found Cases", () => {
		it("should return undefined when task does not exist", async () => {
			const taskId = 999;
			mockHelpRequestRepo.findById.mockResolvedValue(undefined);

			const result = await service.getHelpRequestById(taskId);

			expect(mockHelpRequestRepo.findById).toHaveBeenCalledWith(taskId);
			expect(mockDetailsRepo.findByHelpRequestId).not.toHaveBeenCalled();
			expect(result).toBeUndefined();
		});

		it("should not fetch details when task repository returns null", async () => {
			const taskId = 999;
			mockHelpRequestRepo.findById.mockResolvedValue(null);

			const result = await service.getHelpRequestById(taskId);

			expect(mockDetailsRepo.findByHelpRequestId).not.toHaveBeenCalled();
			expect(result).toBeUndefined();
		});
	});

	describe("Error Handling", () => {
		it("should propagate error when task repository fails", async () => {
			const taskId = 1;
			const dbError = new Error("Database connection failed");
			mockHelpRequestRepo.findById.mockRejectedValue(dbError);

			expect(service.getHelpRequestById(taskId)).rejects.toThrow(
				"Database connection failed",
			);
			expect(mockDetailsRepo.findByHelpRequestId).not.toHaveBeenCalled();
		});

		it("should propagate error when details repository fails", async () => {
			const taskId = 1;
			const mockTask = {
				id: 1,
				userId: "user-123",
				title: "Test",
				description: "Test",
				urgency: "MEDIUM",
				status: "OPEN",
				anonymousMode: false,
				createdAt: new Date(),
				locationCity: "Iași",
				locationAddressText: "Test",
				location: null,
			};

			const detailsError = new Error("Failed to fetch request details");
			mockHelpRequestRepo.findById.mockResolvedValue(mockTask);
			mockDetailsRepo.findByHelpRequestId.mockRejectedValue(detailsError);

			expect(service.getHelpRequestById(taskId)).rejects.toThrow(
				"Failed to fetch request details",
			);
		});

		it("should handle gracefully when details query returns null", async () => {
			const taskId = 1;
			const mockTask = {
				id: 1,
				userId: "user-123",
				title: "Test",
				description: "Test",
				urgency: "MEDIUM",
				status: "OPEN",
				anonymousMode: false,
				createdAt: new Date(),
				locationCity: "Iași",
				locationAddressText: "Test",
				location: null,
			};

			mockHelpRequestRepo.findById.mockResolvedValue(mockTask);
			mockDetailsRepo.findByHelpRequestId.mockResolvedValue(null);

			const result = await service.getHelpRequestById(taskId);

			expect(result.details).toBeNull();
		});
	});

	describe("Repository Call Order", () => {
		it("should call findById before findByHelpRequestId", async () => {
			const callOrder: string[] = [];
			const taskId = 1;

			mockHelpRequestRepo.findById.mockImplementation(async () => {
				callOrder.push("findById");
				return { id: 1, title: "Test" };
			});

			mockDetailsRepo.findByHelpRequestId.mockImplementation(async () => {
				callOrder.push("findByHelpRequestId");
				return { id: 1, helpRequestId: 1 };
			});

			await service.getHelpRequestById(taskId);

			expect(callOrder).toEqual(["findById", "findByHelpRequestId"]);
		});

		it("should not call findByHelpRequestId if task not found", async () => {
			const taskId = 999;
			mockHelpRequestRepo.findById.mockResolvedValue(undefined);

			await service.getHelpRequestById(taskId);

			expect(mockDetailsRepo.findByHelpRequestId).not.toHaveBeenCalled();
		});
	});

	describe("Edge Cases", () => {
		it("should handle task with empty details fields", async () => {
			const taskId = 1;
			const mockTask = { id: 1, title: "Test", status: "OPEN" };
			const mockDetails = {
				id: 1,
				helpRequestId: 1,
				notes: null,
				languageNeeded: null,
				safetyNotes: null,
			};

			mockHelpRequestRepo.findById.mockResolvedValue(mockTask);
			mockDetailsRepo.findByHelpRequestId.mockResolvedValue(mockDetails);

			const result = await service.getHelpRequestById(taskId);

			expect(result.details).toEqual(mockDetails);
			expect(result.details.notes).toBeNull();
			expect(result.details.languageNeeded).toBeNull();
			expect(result.details.safetyNotes).toBeNull();
		});

		it("should handle large ID numbers correctly", async () => {
			const largeId = Number.MAX_SAFE_INTEGER;
			const mockTask = { id: largeId, title: "Large ID test" };

			mockHelpRequestRepo.findById.mockResolvedValue(mockTask);
			mockDetailsRepo.findByHelpRequestId.mockResolvedValue(undefined);

			const result = await service.getHelpRequestById(largeId);

			expect(result.id).toBe(largeId);
			expect(mockHelpRequestRepo.findById).toHaveBeenCalledWith(largeId);
		});

		it("should correctly handle falsy but valid detail values", async () => {
			const taskId = 1;
			const mockTask = { id: 1, title: "Test" };
			const mockDetailsWithFalsyValues = {
				id: 1,
				helpRequestId: 1,
				notes: "", // Empty string is falsy
				languageNeeded: null,
				safetyNotes: undefined,
			};

			mockHelpRequestRepo.findById.mockResolvedValue(mockTask);
			mockDetailsRepo.findByHelpRequestId.mockResolvedValue(
				mockDetailsWithFalsyValues,
			);

			const result = await service.getHelpRequestById(taskId);

			// Should not convert falsy object to null
			expect(result.details).not.toBeNull();
			expect(result.details).toEqual(mockDetailsWithFalsyValues);
		});
	});
});
