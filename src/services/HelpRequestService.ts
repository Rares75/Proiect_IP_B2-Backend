import {
	HelpRequestRepository,
	type CreateHelpRequestDTO,
	type HelpRequest,
	type HelpRequestAssignmentAuthorization,
} from "../db/repositories/helpRequest.repository";
import {
	HelpOfferRepository,
	type HelpOffer,
} from "../db/repositories/helpOffer.repository";
import { VolunteerRepository } from "../db/repositories/volunteer.repository";
import { inject } from "../di";
import { Service } from "../di/decorators/service";
import {
	ModerationService,
	ModerationError,
	ModerationLevel,
} from "./ModerationService";
import { logger } from "../utils/logger";
import type { requestStatusEnum } from "../db/enums";
import {
	ConflictError,
	ForbiddenError,
	InvalidStatusTransitionError,
	NotFoundError,
} from "../utils/Errors";
import { HelpRequestDetailsRepository } from "../db/repositories/requestDetails.repository";
import { NotificationService } from "./NotificationService";
import type { HelpOfferInput } from "../validation";
import type { TaskFilterParams } from "../filters";
import { resolveTaskDistanceFilter } from "./helpRequestDistance";

// State machine
type RequestStatus = (typeof requestStatusEnum.enumValues)[number];

const VALID_TRANSITIONS: Partial<Record<RequestStatus, RequestStatus[]>> = {
	OPEN: ["MATCHED", "CANCELLED"],
	MATCHED: ["IN_PROGRESS", "CANCELLED", "REJECTED"],
	IN_PROGRESS: ["COMPLETED", "CANCELLED"],
};

export class HelpRequestOffersForbiddenError extends Error {
	constructor() {
		super("You don't have permission to see this task.");
		this.name = "HelpRequestOffersForbiddenError";
	}
}

@Service()
export class HelpRequestService {
	constructor(
		@inject(HelpRequestRepository)
		private readonly helpRequestRepo: HelpRequestRepository,
		@inject(HelpOfferRepository)
		private readonly helpOfferRepo: HelpOfferRepository,
		@inject(VolunteerRepository)
		private readonly volunteerRepo: VolunteerRepository,
		@inject(HelpRequestDetailsRepository)
		private readonly helpRequestDetailsRepo: HelpRequestDetailsRepository,
		@inject(ModerationService)
		private readonly moderationService: ModerationService = new ModerationService(),
		@inject(NotificationService)
		private readonly notificationService: NotificationService = {
			notifyEligibleVolunteersForNewRequest: async () => {},
		} as unknown as NotificationService,
	) {}

	async createHelpRequest(data: CreateHelpRequestDTO) {
		const titleResult = this.moderationService.scanContent(data.title);
		const descResult = this.moderationService.scanContent(data.description);

		let finalResult = ModerationLevel.CLEAN;
		if (
			titleResult.level === ModerationLevel.BLOCKED ||
			descResult.level === ModerationLevel.BLOCKED
		) {
			finalResult = ModerationLevel.BLOCKED;
		} else if (
			titleResult.level === ModerationLevel.FLAGGED ||
			descResult.level === ModerationLevel.FLAGGED
		) {
			finalResult = ModerationLevel.FLAGGED;
		}

		const reason = titleResult.reason || descResult.reason;

		if (finalResult === ModerationLevel.BLOCKED) {
			throw new ModerationError(reason ?? "Inappropriate content.");
		}

		if (finalResult === ModerationLevel.FLAGGED) {
			// TODO: do something?
		}

		try {
			const createdRequest = await this.helpRequestRepo.create({
				...data,
				status: "OPEN",
			});

			try {
				await this.notificationService.notifyEligibleVolunteersForNewRequest(
					createdRequest,
				);
			} catch (notificationError) {
				console.error(
					"Failed to notify eligible volunteers for new help request:",
					notificationError,
				);
			}

			return createdRequest;
		} catch (error) {
			console.error("--- RAW DB ERROR ---", error);
			logger.exception(error);
			throw new Error("Could not create help request");
		}
	}

	async getHelpRequests(limit?: number, offset?: number) {
		return this.helpRequestRepo.findMany(limit, offset);
	}

	async getHelpRequestForAuthorization(id: number) {
		return this.helpRequestRepo.findById(id);
	}

	async getAssignmentAuthorization(
		helpRequestId: number,
	): Promise<HelpRequestAssignmentAuthorization | undefined> {
		if (
			typeof this.helpRequestRepo.findAssignmentAuthorizationByHelpRequestId !==
			"function"
		) {
			return undefined;
		}

		return this.helpRequestRepo.findAssignmentAuthorizationByHelpRequestId(
			helpRequestId,
		);
	}

	/**
	 * Retrieves a task with the specified ID and includes the associated details (if any)
	 *
	 * @param id The ID of the help request task
	 * @returns An object containing the task data and the `details` field (null if no details exist)
	 */
	async getHelpRequestById(id: number) {
		//fetch the main task
		const helpRequest = await this.helpRequestRepo.findById(id);

		//if the task doesn't exist, I return `undefined` (the controller will handle the 404)
		if (!helpRequest) {
			return undefined;
		}

		//Get the details associated with the task
		const details = await this.helpRequestDetailsRepo.findByHelpRequestId(id);
		const location =
			typeof this.helpRequestRepo.findLocationByHelpRequestId === "function"
				? await this.helpRequestRepo.findLocationByHelpRequestId(id)
				: undefined;

		return {
			...helpRequest,
			...(location !== undefined
				? {
						city: location?.city ?? null,
						addressText: location?.addressText ?? null,
						location: location?.location ?? null,
					}
				: {}),
			details: details || null,
		};
	}

	/**
	 * Updates a HelpRequest status according to the allowed transitions
	 * @param id - The UUID of the HelpRequest to update
	 * @param newStatus - The target status to transition to
	 * @returns The updated HelpRequest object
	 * @throws {NotFoundError} If the HelpRequest is not found (404)
	 * @throws {InvalidStatusTransitionError} If the transition is forbidden (400)
	 */
	async updateHelpRequestStatus(
		id: number,
		newStatus: RequestStatus,
	): Promise<HelpRequest> {
		const current = await this.helpRequestRepo.findById(id);
		if (!current) {
			throw new NotFoundError("HelpRequest", String(id));
		}

		const currentStatus = current.status;
		const allowedNext = VALID_TRANSITIONS[currentStatus];

		if (!allowedNext?.includes(newStatus)) {
			throw new InvalidStatusTransitionError(currentStatus, newStatus);
		}

		const updated = await this.helpRequestRepo.updateStatus(id, newStatus);
		if (!updated) {
			throw new NotFoundError("HelpRequest", String(id));
		}

		return updated;
	}

	async createOfferForTask(
		helpRequestId: number,
		userId: string,
		input: HelpOfferInput,
	): Promise<HelpOffer> {
		const helpRequest = await this.helpRequestRepo.findById(helpRequestId);
		if (!helpRequest) {
			throw new NotFoundError("HelpRequest", String(helpRequestId));
		}

		if (helpRequest.status !== "OPEN") {
			throw new ConflictError("HelpRequest is not OPEN");
		}

		const volunteer = await this.volunteerRepo.findByUserId(userId);
		if (!volunteer) {
			throw new ForbiddenError("Only volunteers can create offers");
		}

		if (helpRequest.requestedByUserId === userId) {
			throw new ForbiddenError("Task owner cannot create offers");
		}

		const existingPendingOffer =
			await this.helpOfferRepo.findPendingByHelpRequestIdAndVolunteerId(
				helpRequestId,
				volunteer.id,
			);

		if (existingPendingOffer) {
			throw new ConflictError(
				"Volunteer already has a pending offer for this task",
			);
		}

		return this.helpOfferRepo.create({
			helpRequestId,
			volunteerId: volunteer.id,
			message: input.message ?? null,
			status: "PENDING",
		});
	}

	//BE1-12
	async getPaginatedTasks(
		page: number,
		pageSize: number,
		sortBy: "createdAt" | "urgency" = "createdAt",
		order: "ASC" | "DESC" = "DESC",
		filters?: TaskFilterParams,
		userId?: string,
	) {
		const resolvedFilters = await resolveTaskDistanceFilter(
			filters,
			userId,
			this.volunteerRepo,
		);
		const { data, total } = await this.helpRequestRepo.findPaginatedWithDetails(
			page,
			pageSize,
			sortBy,
			order,
			resolvedFilters,
		);

		const totalPages = Math.ceil(total / pageSize);

		const formattedData = data.map((task) => {
			if (task.anonymousMode) {
				const { requestedByUserId, ...restOfTask } = task;
				return restOfTask;
			}
			return task;
		});

		return {
			data: formattedData,
			meta: {
				page: page,
				pageSize: pageSize,
				total: total,
				totalPages: totalPages,
			},
		};
	}

	async getPaginatedOffersForTaskOwner(
		taskId: number,
		requesterUserId: string,
		page: number,
		pageSize: number,
		status?: "PENDING" | "ACCEPTED" | "REJECTED",
	) {
		// verif existența task-ului și ownership-ul
		const task = await this.helpRequestRepo.findById(taskId);
		if (!task) {
			throw new NotFoundError("HelpRequest", String(taskId));
		}

		if (task.requestedByUserId !== requesterUserId) {
			//console.log(task.requestedByUserId + " " + requesterUserId);
			throw new ForbiddenError("You don't have permission to see this task.");
		}

		// 2. ofertele
		const { data, total } =
			await this.helpOfferRepo.findPaginatedOffersByTaskId(
				taskId,
				page,
				pageSize,
				status,
			);

		// răspunsul cerut
		const formattedOffers = data.map((offer) => {
			//datele vizibile garantat
			const volunteerInfo: any = {
				username: offer.username,
				trustScore: offer.trustScore,
				averageRating:
					offer.averageRating !== null ? Number(offer.averageRating) : null,
			};

			if (offer.hiddenIdentity === false) {
				volunteerInfo.name = offer.name;
			}

			return {
				id: offer.id,
				volunteerId: offer.volunteerId,
				message: offer.message,
				status: offer.status,
				createdAt: offer.createdAt,
				volunteer: volunteerInfo,
			};
		});

		const totalPages = Math.ceil(total / pageSize);

		return {
			data: formattedOffers,
			meta: {
				page: page,
				pageSize: pageSize,
				total: total,
				totalPages: totalPages,
			},
		};
	}
	//BE1-31
	async createGuestHelpRequest(sessionId: string, data: any) {
		// 1. Verificam limita de 3 task-uri active pe sesiune
		const activeCount =
			await this.helpRequestRepo.countActiveByGuestSession(sessionId);
		if (activeCount >= 3) {
			const error: any = new Error("Too many active requests");
			error.name = "RateLimitError"; // Nume specific pentru a-l prinde in controller cu 429
			throw error;
		}

		// 2. Construim datele finale, forțând regulile de business pentru Guest
		const guestData: CreateHelpRequestDTO = {
			...(data as any),
			title: data.title,
			description: data.description ?? null,
			audioUrl: data.audioUrl ?? null,
			category: "MESSAGES_ONLY",
			guestSessionId: sessionId,
			requestedByUserId: null, // Guestul nu are cont
			urgency: data.urgency ?? "HIGH",
			anonymousMode: true, // Fortat conform cerintelor
			status: "OPEN",
			city: data.city,
			addressText: data.addressText,
			location: data.location,
			skillsNeeded: data.skillsNeeded,
		};

		// 3. Scanare pentru moderarea continutului
		const titleResult = this.moderationService.scanContent(guestData.title);
		const descResult = this.moderationService.scanContent(
			guestData.description || "",
		);

		let finalResult = ModerationLevel.CLEAN;
		if (
			titleResult.level === ModerationLevel.BLOCKED ||
			descResult.level === ModerationLevel.BLOCKED
		) {
			finalResult = ModerationLevel.BLOCKED;
		}

		if (finalResult === ModerationLevel.BLOCKED) {
			throw new ModerationError(
				titleResult.reason || descResult.reason || "Inappropriate content.",
			);
		}

		try {
			// 1. Salvăm cererea principală în help_requests
			const createdRequest = await this.helpRequestRepo.create(guestData);

			// 2. Salvăm detaliile suplimentare în tabelul request_details
			// Verificăm dacă avem efectiv date de salvat în acest tabel
			if (data.notes || data.languageNeeded || data.safetyNotes) {
				await this.helpRequestDetailsRepo.create({
					helpRequestId: createdRequest.id, // Legăm detaliile de ID-ul task-ului tocmai creat
					notes: data.notes ?? null,
					languageNeeded: data.languageNeeded ?? null,
					safetyNotes: data.safetyNotes ?? null,
				});
			}

			// Returnăm obiectul creat
			return createdRequest;
		} catch (error) {
			console.error("--- RAW DB ERROR ---", error);
			logger.exception(error as Error);
			throw new Error("Could not create guest help request");
		}
	}

	async getGuestHelpRequests(
		sessionId: string,
		page: number,
		pageSize: number,
		status?: (typeof requestStatusEnum.enumValues)[number],
	) {
		const { data, total } =
			await this.helpRequestRepo.findPaginatedByGuestSession(
				sessionId,
				page,
				pageSize,
				status,
			);

		const formattedData = data.map((task) => {
			const { requestedByUserId, guestSessionId, ...rest } = task;
			return rest;
		});

		return {
			data: formattedData,
			meta: {
				page,
				pageSize,
				total,
				totalPages: Math.ceil(total / pageSize),
			},
		};
	}

	async deleteGuestHelpRequest(
		guestSession: string,
		id: number,
	): Promise<void> {
		//find the task
		const task = await this.helpRequestRepo.findById(id);

		if (!task) {
			throw new NotFoundError("HelpRequest", String(id));
		}

		// Verify ownership
		if (task.guestSessionId !== guestSession) {
			throw new ForbiddenError(
				"You do not have permission to delete this task.",
			);
		}

		// Verify status is OPEN
		if (task.status !== "OPEN") {
			throw new ConflictError("Task cannot be deleted because it is not OPEN.");
		}

		// Delete task (cascade delete applies to related records)
		await this.helpRequestRepo.delete(id);
	}

	/**
	 * Delete a help request by its owner (authenticated user)
	 * - Only allows deletion if status is OPEN or CANCELLED
	 * - Rejects all PENDING offers before deletion
	 * - Notifies all volunteers with pending offers
	 *
	 * @param id - The ID of the help request to delete
	 * @param userId - The ID of the user attempting the deletion
	 * @throws {NotFoundError} If the task does not exist
	 * @throws {ForbiddenError} If the user is not the task owner
	 * @throws {ConflictError} If the task status is not OPEN or CANCELLED
	 */
	async deleteHelpRequestByOwner(id: number, userId: string): Promise<void> {
		// Fetch the task to verify existence and permissions
		const task = await this.helpRequestRepo.findById(id);

		if (!task) {
			throw new NotFoundError("HelpRequest", String(id));
		}

		// Verify ownership: only the task owner can delete
		if (task.requestedByUserId !== userId) {
			throw new ForbiddenError(
				"You do not have permission to delete this task.",
			);
		}

		// Check status: only OPEN or CANCELLED tasks can be deleted
		// Blocking statuses: MATCHED, IN_PROGRESS, COMPLETED, REJECTED
		const blockingStatuses = [
			"MATCHED",
			"IN_PROGRESS",
			"COMPLETED",
			"REJECTED",
		];
		if (blockingStatuses.includes(task.status)) {
			throw new ConflictError(
				`Task cannot be deleted because it is in ${task.status} status. Only OPEN or CANCELLED tasks can be deleted.`,
			);
		}

		// Transaction: update offers to REJECTED and delete task (atomic).
		// We also create notifications inside the same transaction to guarantee
		// that notifications are created for every affected volunteer or the whole
		// operation is rolled back. The authoritative list of affected volunteers is
		// provided by the repository into the callback to avoid race conditions.
		const result = await this.helpRequestRepo.deleteWithOfferRejection(
			id,
			async (tx, pendingOffers) => {
				if (pendingOffers && pendingOffers.length > 0) {
					// ensure all pending offers have a volunteerUserId; if not, fail the transaction
					if (pendingOffers.some((p) => !p.volunteerUserId)) {
						throw new Error("Missing volunteer user id for pending offers");
					}

					const notifications = pendingOffers.map((offer) => ({
						userId: offer.volunteerUserId as string,
						type: "TASK_UPDATED" as const,
						text: `The task "${task.title}" has been cancelled and all offers have been rejected.`,
						relatedRequestId: id,
						relatedAssignmentId: null,
						createdAt: new Date(),
					}));

					// create notifications inside the same tx using the notification service
					await this.notificationService.notifyVolunteersPendingOffersCancelled(
						notifications,
						tx,
					);
				}
			},
		);

		// If delete did not remove any row, surface NotFound to caller
		if (!result.deleted) {
			throw new NotFoundError("HelpRequest", String(id));
		}
	}
}
