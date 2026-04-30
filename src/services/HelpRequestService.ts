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
import { NotificationService } from "./NotificationService";
import type { TaskFilterParams } from "../filters";

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
		private readonly moderationService?: ModerationService,
		@inject(NotificationService)
		private readonly notificationService?: NotificationService,
	) {}

	async createHelpRequest(data: CreateHelpRequestDTO) {
		if (this.moderationService) {
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
		}

		try {
			const createdRequest = await this.helpRequestRepo.create({
				...data,
				status: "OPEN",
			});

			try {
				await this.notificationService?.notifyEligibleVolunteersForNewRequest(
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
		return this.helpRequestRepo.findAssignmentAuthorizationByHelpRequestId(
			helpRequestId,
		);
	}

	async getHelpRequestById(id: number) {
		const helpRequest = await this.helpRequestRepo.findById(id);

		if (!helpRequest) {
			return undefined;
		}

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

	async getPaginatedTasks(
		page: number,
		pageSize: number,
		sortBy: "createdAt" | "urgency" = "createdAt",
		order: "ASC" | "DESC" = "DESC",
		filters?: TaskFilterParams,
	) {
		const { data, total } = await this.helpRequestRepo.findPaginatedWithDetails(
			page,
			pageSize,
			sortBy,
			order,
			filters,
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
				page,
				pageSize,
				total,
				totalPages,
			},
		};
	}
}
