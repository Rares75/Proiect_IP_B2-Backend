import {
	HelpRequestRepository,
	type CreateHelpRequestDTO,
	type HelpRequest,
} from "../db/repositories/helpRequest.repository";
import { inject } from "../di";
import { Service } from "../di/decorators/service";
import { ModerationService, ModerationError, ModerationLevel } from "./ModerationService";
import { logger } from "../utils/logger";
import type { requestStatusEnum } from "../db/enums";
import { InvalidStatusTransitionError, NotFoundError } from "../utils/Errors";
import { HelpRequestDetailsRepository } from "../db/repositories/requestDetails.repository";

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
		private readonly moderationService: ModerationService,
	) {}

	async createHelpRequest(data: CreateHelpRequestDTO) {
		const titleResult = this.moderationService.scanContent(data.title);
    	const descResult = this.moderationService.scanContent(data.description);

		let finalResult = ModerationLevel.CLEAN;
		if (titleResult.level === ModerationLevel.BLOCKED || descResult.level === ModerationLevel.BLOCKED) {
			finalResult = ModerationLevel.BLOCKED;
		} else if (titleResult.level === ModerationLevel.FLAGGED || descResult.level === ModerationLevel.FLAGGED) {
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
						locationCity: location?.city ?? null,
						locationAddressText: location?.addressText ?? null,
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
	async getPaginatedTasks(page: number, pageSize: number, filters?: any) {
		const { data, total } = await this.helpRequestRepo.findPaginatedWithDetails(
			page,
			pageSize,
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
				page: page,
				pageSize: pageSize,
				total: total,
				totalPages: totalPages,
			},
		};
	}
}
