import { helpRequestRepository, type CreateHelpRequestDTO } from "../db/repositories/helpRequests.repository";
import { helpRequestRepository } from "@server/repositories/HelpRequestRepository";
import { type HelpRequestType, type RequestStatusType } from "@server/db/schema";
import {InvalidStatusTransitionError, NotFoundError} from "@server/utils/Errors";

// State machine
const VALID_TRANSITIONS: Partial<Record<RequestStatusType, RequestStatusType[]>> = {
  OPEN:        ["MATCHED"],
  MATCHED:     ["IN_PROGRESS", "CANCELLED", "REJECTED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
};

export class HelpRequestService {
  async createHelpRequest(data: CreateHelpRequestDTO) {
    try {
      return await helpRequestRepository.create({
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
  async updateHelpRequestStatus(id: string,newStatus: RequestStatusType): Promise<HelpRequestType> {
    const current = await helpRequestRepository.findByID(id);
    if (!current) {
      throw new NotFoundError("HelpRequest", id);
    }

    const currentStatus = current.status;
    const allowedNext = VALID_TRANSITIONS[currentStatus];

    if (!allowedNext?.includes(newStatus)) {
      throw new InvalidStatusTransitionError(currentStatus, newStatus);
    }

    const updated = await helpRequestRepository.updateStatus(id, newStatus);
    return updated!;

  }
}

export const helpRequestService = new HelpRequestService();