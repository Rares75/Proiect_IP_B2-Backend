import {
    HelpRequestRepository,
    type CreateHelpRequestDTO,
    type HelpRequest,
} from "../db/repositories/helpRequests.repository";
import {inject} from "../di";
import {Service} from "../di/decorators/service";
import type {requestStatusEnum} from "../db/enums";
import {InvalidStatusTransitionError, NotFoundError} from "../utils/Errors";

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
    ) {
    }

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

    /**
     * Updates a HelpRequest status according to the allowed transitions
     * @param id - The UUID of the HelpRequest to update
     * @param newStatus - The target status to transition to
     * @returns The updated HelpRequest object
     * @throws {NotFoundError} If the HelpRequest is not found (404)
     * @throws {InvalidStatusTransitionError} If the transition is forbidden (400)
     */
    async updateHelpRequestStatus(id: number, newStatus: RequestStatus): Promise<HelpRequest> {
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
}
