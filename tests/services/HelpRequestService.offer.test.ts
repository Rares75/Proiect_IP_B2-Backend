import { beforeEach, describe, expect, mock, test } from "bun:test";
import { HelpRequestService } from "../../src/services/HelpRequestService";
import { ForbiddenError, NotFoundError } from "../../src/utils/Errors";

const makeOffer = (overrides = {}) => ({
	id: 1,
	volunteerId: 10,
	message: "Pot ajuta!",
	status: "PENDING" as const,
	createdAt: new Date("2026-04-28T10:00:00Z"),
	volunteerUserId: "vol-user-1",
	username: "ionpop",
	name: "Ion Popescu",
	hiddenIdentity: false,
	trustScore: 4.5,
	averageRating: "4.20",
	bio: "Bio here",
	...overrides,
});

describe("HelpRequestService - getPaginatedOffersForTaskOwner", () => {
	let service: HelpRequestService;
	let helpRequestRepo: any;
	let helpOfferRepo: any;
	let volunteerRepo: any;
	let helpRequestDetailsRepo: any;
	let ratingsRepo: any;
	let moderationService: any;

	beforeEach(() => {
		helpRequestRepo = { findById: mock() };
		helpOfferRepo = { findPaginatedOffersByTaskId: mock() };
		volunteerRepo = { findByUserId: mock() };
		helpRequestDetailsRepo = { findByHelpRequestId: mock() };
		ratingsRepo = { findByVolunteerId: mock() };
		moderationService = { scanContent: mock() };

		service = new HelpRequestService(
			helpRequestRepo,
			helpOfferRepo,
			volunteerRepo,
			helpRequestDetailsRepo,
			ratingsRepo,
		);
	});

	test("throws NotFoundError when task does not exist", async () => {
		helpRequestRepo.findById.mockResolvedValueOnce(null);

		await expect(
			service.getPaginatedOffersForTaskOwner(99, "user-1", 1, 10),
		).rejects.toThrow(NotFoundError);

		expect(helpOfferRepo.findPaginatedOffersByTaskId).not.toHaveBeenCalled();
	});

	test("throws ForbiddenError when requester is not the task owner", async () => {
		helpRequestRepo.findById.mockResolvedValueOnce({
			requestedByUserId: "owner-123",
		});

		await expect(
			service.getPaginatedOffersForTaskOwner(1, "someone-else", 1, 10),
		).rejects.toThrow(ForbiddenError);

		expect(helpOfferRepo.findPaginatedOffersByTaskId).not.toHaveBeenCalled();
	});

	test("includes name when hiddenIdentity is false", async () => {
		helpRequestRepo.findById.mockResolvedValueOnce({
			requestedByUserId: "owner-123",
		});
		helpOfferRepo.findPaginatedOffersByTaskId.mockResolvedValueOnce({
			data: [makeOffer({ hiddenIdentity: false })],
			total: 1,
		});

		const result = await service.getPaginatedOffersForTaskOwner(
			1,
			"owner-123",
			1,
			10,
		);

		expect(result.data[0].volunteer.name).toBe("Ion Popescu");
		expect(result.data[0].volunteer.username).toBe("ionpop");
	});

	test("omits name but keeps username when hiddenIdentity is true", async () => {
		helpRequestRepo.findById.mockResolvedValueOnce({
			requestedByUserId: "owner-123",
		});
		helpOfferRepo.findPaginatedOffersByTaskId.mockResolvedValueOnce({
			data: [makeOffer({ hiddenIdentity: true })],
			total: 1,
		});

		const result = await service.getPaginatedOffersForTaskOwner(
			1,
			"owner-123",
			1,
			10,
		);

		expect(result.data[0].volunteer.username).toBe("ionpop");
		expect(result.data[0].volunteer).not.toHaveProperty("name");
	});

	test("volunteerId is always present regardless of hiddenIdentity", async () => {
		helpRequestRepo.findById.mockResolvedValueOnce({
			requestedByUserId: "owner-123",
		});
		helpOfferRepo.findPaginatedOffersByTaskId.mockResolvedValueOnce({
			data: [makeOffer({ volunteerId: 42, hiddenIdentity: true })],
			total: 1,
		});

		const result = await service.getPaginatedOffersForTaskOwner(
			1,
			"owner-123",
			1,
			10,
		);

		expect(result.data[0].volunteerId).toBe(42);
	});

	test("casts averageRating from Postgres string to number", async () => {
		helpRequestRepo.findById.mockResolvedValueOnce({
			requestedByUserId: "owner-123",
		});
		helpOfferRepo.findPaginatedOffersByTaskId.mockResolvedValueOnce({
			data: [makeOffer({ averageRating: "4.25" })],
			total: 1,
		});

		const result = await service.getPaginatedOffersForTaskOwner(
			1,
			"owner-123",
			1,
			10,
		);
		const avg = result.data[0].volunteer.averageRating;

		expect(avg).toBe(4.25);
		expect(typeof avg).toBe("number");
	});

	test("averageRating is null when volunteer has no ratings", async () => {
		helpRequestRepo.findById.mockResolvedValueOnce({
			requestedByUserId: "owner-123",
		});
		helpOfferRepo.findPaginatedOffersByTaskId.mockResolvedValueOnce({
			data: [makeOffer({ averageRating: null })],
			total: 1,
		});

		const result = await service.getPaginatedOffersForTaskOwner(
			1,
			"owner-123",
			1,
			10,
		);

		expect(result.data[0].volunteer.averageRating).toBeNull();
	});

	test("computes totalPages correctly", async () => {
		helpRequestRepo.findById.mockResolvedValueOnce({
			requestedByUserId: "owner-123",
		});
		helpOfferRepo.findPaginatedOffersByTaskId.mockResolvedValueOnce({
			data: [],
			total: 25,
		});

		const result = await service.getPaginatedOffersForTaskOwner(
			1,
			"owner-123",
			2,
			10,
		);

		expect(result.meta).toEqual({
			page: 2,
			pageSize: 10,
			total: 25,
			totalPages: 3,
		});
	});

	test("forwards status filter to repository", async () => {
		helpRequestRepo.findById.mockResolvedValueOnce({
			requestedByUserId: "owner-123",
		});
		helpOfferRepo.findPaginatedOffersByTaskId.mockResolvedValueOnce({
			data: [],
			total: 0,
		});

		await service.getPaginatedOffersForTaskOwner(
			1,
			"owner-123",
			1,
			10,
			"ACCEPTED",
		);

		expect(helpOfferRepo.findPaginatedOffersByTaskId).toHaveBeenCalledWith(
			1,
			1,
			10,
			"ACCEPTED",
		);
	});

	test("passes undefined status when no filter provided", async () => {
		helpRequestRepo.findById.mockResolvedValueOnce({
			requestedByUserId: "owner-123",
		});
		helpOfferRepo.findPaginatedOffersByTaskId.mockResolvedValueOnce({
			data: [],
			total: 0,
		});

		await service.getPaginatedOffersForTaskOwner(1, "owner-123", 1, 10);

		expect(helpOfferRepo.findPaginatedOffersByTaskId).toHaveBeenCalledWith(
			1,
			1,
			10,
			undefined,
		);
	});
});
