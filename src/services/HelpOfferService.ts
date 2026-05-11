import { inject } from "../di";
import { Service } from "../di/decorators/service";
import { HelpRequestRepository } from "../db/repositories/helpRequest.repository";
import {
	HelpOfferRepository,
	type CreateHelpOfferDTO,
} from "../db/repositories/helpOffer.repository";
import { VolunteerRepository } from "../db/repositories/volunteer.repository";

export class HelpOfferTaskNotFoundError extends Error {
	constructor(helpRequestId: number) {
		super(`HelpRequest with id ${helpRequestId} not found`);
		this.name = "HelpOfferTaskNotFoundError";
	}
}

export class HelpOfferTaskStatusConflictError extends Error {
	constructor(status: string) {
		super(
			`Offers can only be created for OPEN tasks. Current status: ${status}`,
		);
		this.name = "HelpOfferTaskStatusConflictError";
	}
}

export class HelpOfferForbiddenError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "HelpOfferForbiddenError";
	}
}

export class HelpOfferDuplicatePendingError extends Error {
	constructor() {
		super("A pending offer already exists for this volunteer and task");
		this.name = "HelpOfferDuplicatePendingError";
	}
}

@Service()
export class HelpOfferService {
	constructor(
		@inject(HelpRequestRepository)
		private readonly helpRequestRepo: HelpRequestRepository,
		@inject(HelpOfferRepository)
		private readonly helpOfferRepo: HelpOfferRepository,
		@inject(VolunteerRepository)
		private readonly volunteerRepo: VolunteerRepository,
	) {}

	async createOffer(
		helpRequestId: number,
		sessionUserId: string,
		payload: Pick<CreateHelpOfferDTO, "message">,
	) {
		const task = await this.helpRequestRepo.findById(helpRequestId);
		if (!task) {
			throw new HelpOfferTaskNotFoundError(helpRequestId);
		}

		if (task.status !== "OPEN") {
			throw new HelpOfferTaskStatusConflictError(task.status);
		}

		if (task.requestedByUserId === sessionUserId) {
			throw new HelpOfferForbiddenError(
				"You cannot submit an offer for your own task",
			);
		}

		const volunteer = await this.volunteerRepo.findByUserId(sessionUserId);
		if (!volunteer) {
			throw new HelpOfferForbiddenError(
				"Only volunteers can submit offers for tasks",
			);
		}

		const existingPendingOffer =
			await this.helpOfferRepo.findPendingByHelpRequestIdAndVolunteerId(
				helpRequestId,
				volunteer.id,
			);
		if (existingPendingOffer) {
			throw new HelpOfferDuplicatePendingError();
		}

		return this.helpOfferRepo.create({
			helpRequestId,
			volunteerId: volunteer.id,
			message: payload.message ?? null,
			status: "PENDING",
		});
	}
}
