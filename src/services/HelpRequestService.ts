import {
	HelpRequestRepository,
	type CreateHelpRequestDTO,
	type HelpRequest,
} from "../db/repositories/helpRequest.repository";
import { inject } from "../di";
import { Service } from "../di/decorators/service";
import type { requestStatusEnum } from "../db/enums";
import { InvalidStatusTransitionError, NotFoundError } from "../utils/Errors";
import { HelpRequestDetailsRepository } from "../db/repositories/requestDetails.repository";
import type { TaskFilterParams } from "../filters";
import { VolunteerRepository } from "../db/repositories/volunteer.repository";

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
		@inject(VolunteerRepository)
		private readonly volunteerRepo?: VolunteerRepository,
	) {}

	async createHelpRequest(data: CreateHelpRequestDTO) {
		try {
			return await this.helpRequestRepo.create({
				...data,
				status: "OPEN",
			});
		} catch (error) {
			console.error("Failed to create help request:", error);
			throw new Error("Could not create help request");
		}
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
						locationCity: location?.city ?? null,
						locationAddressText: location?.addressText ?? null,
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

	private async resolveTaskFilters(
		filters: TaskFilterParams | undefined,
		userId?: string,
	): Promise<TaskFilterParams | undefined> {
		if (!filters?.distance || filters.distance.radiusKm !== undefined) {
			return filters;
		}

		if (!userId || !this.volunteerRepo) {
			throw new Error("Radius is required");
		}

		const volunteerProfile =
			await this.volunteerRepo.findDistancePreferencesByUserId(userId);

		if (!volunteerProfile?.maxDistanceKm) {
			throw new Error("Radius is required");
		}

		return {
			...filters,
			distance: {
				...filters.distance,
				radiusKm: volunteerProfile.maxDistanceKm,
			},
		};
	}

	async getPaginatedTasks(
		page: number,
		pageSize: number,
		sortBy: "createdAt" | "urgency" = "createdAt",
		order: "ASC" | "DESC" = "DESC",
		filters?: TaskFilterParams,
		userId?: string,
	) {
		const resolvedFilters = await this.resolveTaskFilters(filters, userId);
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
				page,
				pageSize,
				total,
				totalPages,
			},
		};
	}
}
