import {
	HelpRequestRepository,
	type CreateHelpRequestDTO,
	type HelpRequest,
	type HelpRequestAssignmentAuthorization,
} from "../db/repositories/helpRequest.repository";
import { inject } from "../di";
import { Service } from "../di/decorators/service";
import {
	ModerationService,
	ModerationError,
	ModerationLevel,
} from "./ModerationService";
import { logger } from "../utils/logger";
import type { requestStatusEnum } from "../db/enums";
import { InvalidStatusTransitionError, NotFoundError } from "../utils/Errors";
import { HelpRequestDetailsRepository } from "../db/repositories/requestDetails.repository";
import type { TaskFilterParams } from "../filters";
import { VolunteerRepository } from "../db/repositories/volunteer.repository";
import { resolveTaskDistanceFilter } from "./helpRequestDistance";

// State machine
type RequestStatus = (typeof requestStatusEnum.enumValues)[number];

const VALID_TRANSITIONS: Partial<Record<RequestStatus, RequestStatus[]>> = {
	OPEN: ["MATCHED", "CANCELLED"],
	MATCHED: ["IN_PROGRESS", "CANCELLED", "REJECTED"],
	IN_PROGRESS: ["COMPLETED", "CANCELLED"],
};

@Service()
export class HelpRequestService {
	constructor(
		@inject(HelpRequestRepository)
		private readonly helpRequestRepo: HelpRequestRepository,
		@inject(HelpRequestDetailsRepository)
		private readonly helpRequestDetailsRepo: HelpRequestDetailsRepository,
		@inject(ModerationService)
		private readonly moderationService: ModerationService = new ModerationService(),
		@inject(VolunteerRepository)
		private readonly volunteerRepo: VolunteerRepository = new VolunteerRepository(),
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
			return await this.helpRequestRepo.create({
				...data,
				status: "OPEN",
			});
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
	//BE1-31
	async createGuestHelpRequest(
		sessionId: string,
		data: Partial<CreateHelpRequestDTO>,
	) {
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
			guestSessionId: sessionId,
			requestedByUserId: null, // Guestul nu are cont
			urgency: "CRITICAL", // Fortat conform cerintelor
			anonymousMode: true, // Fortat conform cerintelor
			status: "OPEN",
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
			return await this.helpRequestRepo.create(guestData);
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
}
