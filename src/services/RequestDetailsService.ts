import { inject } from "../di";
import { Service } from "../di/decorators/service";
import type { requestStatusEnum } from "../db/enums";
import { HelpRequestRepository } from "../db/repositories/helpRequest.repository";
import {
	HelpRequestDetailsRepository,
	type UpdateHelpRequestDetailsDTO,
} from "../db/repositories/requestDetails.repository";

type RequestStatus = (typeof requestStatusEnum.enumValues)[number];

type DeleteHelpRequestDetailsResult =
	| { status: 204 }
	| { status: 404 | 409 | 500; body: { message: string } };

type DetailsAuthorizationResult =
	| { status: "allowed" }
	| { status: "notFound" }
	| { status: "forbidden" }
	| { status: "invalidStatus" };

type UpsertHelpRequestDetailsResult =
	| { status: 200 | 201; data: any }
	| { status: 404 | 409 | 500; message: string };

const OPEN_STATUS: RequestStatus = "OPEN";

const NON_DELETABLE_STATUSES = new Set<RequestStatus>([
	"MATCHED",
	"IN_PROGRESS",
	"COMPLETED",
	"CANCELLED",
	"REJECTED",
]);

@Service()
export class RequestDetailsService {
	constructor(
		@inject(HelpRequestRepository)
		private readonly helpRequestRepo: HelpRequestRepository,
		@inject(HelpRequestDetailsRepository)
		private readonly requestDetailsRepo: HelpRequestDetailsRepository,
	) {}

	protected async getHelpRequestRepository() {
		return this.helpRequestRepo;
	}

	protected async getRequestDetailsRepository() {
		return this.requestDetailsRepo;
	}

	async authorizeDetailsMutation(
		helpRequestId: number,
		userId: string,
	): Promise<DetailsAuthorizationResult> {
		const task = await this.helpRequestRepo.findById(helpRequestId);
		if (!task) {
			return { status: "notFound" };
		}

		if (task.requestedByUserId !== userId) {
			return { status: "forbidden" };
		}

		if (task.status !== OPEN_STATUS) {
			return { status: "invalidStatus" };
		}

		return { status: "allowed" };
	}

	async upsertDetails(
		helpRequestId: number,
		data: UpdateHelpRequestDetailsDTO,
	): Promise<UpsertHelpRequestDetailsResult> {
		try {
			// check existence and status
			const task = await this.helpRequestRepo.findById(helpRequestId);

			if (!task) {
				return { status: 404, message: "Task not found" };
			}

			if (task.status !== "OPEN") {
				return { status: 409, message: "Task must be OPEN to update details" };
			}

			// Check if details already exist for this task
			const existing =
				await this.requestDetailsRepo.findByHelpRequestId(helpRequestId);

			if (existing) {
				// If exists -> update with full overwrite
				const updated = await this.requestDetailsRepo.updateByHelpRequestId(
					helpRequestId,
					data,
				);
				return { status: 200, data: updated };
			} else {
				// If it does not exist -> create
				const created = await this.requestDetailsRepo.create({
					...data,
					helpRequestId,
				});
				return { status: 201, data: created };
			}
		} catch (error) {
			console.error("Failed to upsert help request details:", error);
			return { status: 500, message: "Could not update help request details" };
		}
	}

	async deleteHelpRequestDetails(
		helpRequestId: number,
	): Promise<DeleteHelpRequestDetailsResult> {
		try {
			const helpRequestRepo = await this.getHelpRequestRepository();
			const requestDetailsRepo = await this.getRequestDetailsRepository();

			const task = await helpRequestRepo.findById(helpRequestId);
			if (!task) {
				return {
					status: 404,
					body: { message: "Task not found." },
				};
			}

			if (NON_DELETABLE_STATUSES.has(task.status as RequestStatus)) {
				return {
					status: 409,
					body: {
						message:
							"Details cannot be deleted when task status is MATCHED, IN_PROGRESS, COMPLETED, CANCELLED or REJECTED.",
					},
				};
			}

			const existingDetails =
				await requestDetailsRepo.findByHelpRequestId(helpRequestId);
			if (!existingDetails) {
				return {
					status: 409,
					body: { message: "Task has no details." },
				};
			}

			const deleted =
				await requestDetailsRepo.deleteByHelpRequestId(helpRequestId);
			if (!deleted) {
				return {
					status: 500,
					body: { message: "Task details could not be deleted." },
				};
			}

			return { status: 204 };
		} catch (error) {
			console.error("Failed to delete help request details:", error);
			return {
				status: 500,
				body: { message: "Task details could not be deleted." },
			};
		}
	}
}
