import { Service } from "../di/decorators/service";

type HelpRequestRepositoryLike = {
  findById: (id: number) => Promise<{ status: string } | undefined>;
};

type RequestDetailsRepositoryLike = {
  findByHelpRequestId: (id: number) => Promise<unknown | undefined>;
  deleteByHelpRequestId: (id: number) => Promise<boolean>;
};

type DeleteRequestDetailsResponse =
  | {
      status: 204;
    }
  | {
      status: 404 | 409 | 500;
      body: { message: string };
    };

@Service()
export class RequestDetailsService {
  protected async getHelpRequestRepository(): Promise<HelpRequestRepositoryLike> {
    const { helpRequestRepository } = await import("../db/repositories/helpRequest.repository");
    return helpRequestRepository;
  }

  protected async getRequestDetailsRepository(): Promise<RequestDetailsRepositoryLike> {
    const { requestDetailsRepository } = await import("../db/repositories/requestDetails.repository");
    return requestDetailsRepository;
  }

  async deleteHelpRequestDetails(id: number): Promise<DeleteRequestDetailsResponse> {
    const helpRequestRepository = await this.getHelpRequestRepository();
    const requestDetailsRepository = await this.getRequestDetailsRepository();
    const task = await helpRequestRepository.findById(id);

    if (!task) {
      return {
        status: 404,
        body: { message: "Task not found." },
      };
    }

    if (["MATCHED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "REJECTED"].includes(task.status)) {
      return {
        status: 409,
        body: {
          message:
            "Details cannot be deleted when task status is MATCHED, IN_PROGRESS, COMPLETED, CANCELLED or REJECTED.",
        },
      };
    }

    const details = await requestDetailsRepository.findByHelpRequestId(id);

    if (!details) {
      return {
        status: 409,
        body: { message: "Task has no details." },
      };
    }

    const deleted = await requestDetailsRepository.deleteByHelpRequestId(id);

    if (!deleted) {
      return {
        status: 500,
        body: { message: "Task details could not be deleted." },
      };
    }

    return {
      status: 204,
    };
  }
}

export const requestDetailsService = new RequestDetailsService();
