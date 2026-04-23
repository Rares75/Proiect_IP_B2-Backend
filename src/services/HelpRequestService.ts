import {
	HelpRequestRepository,
	type CreateHelpRequestDTO,
} from "../db/repositories/helpRequest.repository";
import { inject } from "../di";
import { Service } from "../di/decorators/service";

type DeleteHelpRequestDetailsResponse =
	| {
			status: 204;
	  }
	| {
			status: 404 | 409;
			body: { error: string };
	  };

@Service()
export class HelpRequestService {
	constructor(
		@inject(HelpRequestRepository)
		private readonly helpRequestRepo: HelpRequestRepository,
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

	async deleteHelpRequestDetails(
		id: number,
	): Promise<DeleteHelpRequestDetailsResponse> {
		const task = await this.helpRequestRepo.findById(id);

		if (!task) {
			return {
				status: 404,
				body: { error: "Task not found." },
			};
		}

		if (
			["MATCHED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "REJECTED"].includes(
				task.status,
			)
		) {
			return {
				status: 409,
				body: {
					error:
						"Details cannot be deleted when task status is MATCHED, IN_PROGRESS, COMPLETED, CANCELLED or REJECTED.",
				},
			};
		}

		const details = await this.helpRequestRepo.findDetailsByHelpRequestId(id);

		if (!details) {
			return {
				status: 409,
				body: { error: "Task has no details." },
			};
		}

		await this.helpRequestRepo.deleteDetailsByHelpRequestId(id);

		return {
			status: 204,
		};
	}
}
