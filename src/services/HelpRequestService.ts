import { helpRequestRepository, type CreateHelpRequestDTO } from "../db/repositories/helpRequests.repository";

type DeleteHelpRequestDetailsResponse =
  | {
      status: 204;
    }
  | {
      status: 404 | 409;
      body: { error: string };
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

  async deleteHelpRequestDetails(id: number): Promise<DeleteHelpRequestDetailsResponse> {
    const task = await helpRequestRepository.findById(id);

    if (!task) {
      return {
        status: 404,
        body: { error: "Task not found." },
      };
    }

    if (["MATCHED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "REJECTED"].includes(task.status)) {
      return {
        status: 409,
        body: {
          error: "Details cannot be deleted when task status is MATCHED, IN_PROGRESS, COMPLETED, CANCELLED or REJECTED.",
        },
      };
    }

    const details = await helpRequestRepository.findDetailsByHelpRequestId(id);

    if (!details) {
      return {
        status: 409,
        body: { error: "Task has no details." },
      };
    }

    await helpRequestRepository.deleteDetailsByHelpRequestId(id);

    return {
      status: 204,
    };
  }
}

export const helpRequestService = new HelpRequestService();
