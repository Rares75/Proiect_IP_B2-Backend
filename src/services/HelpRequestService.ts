import { helpRequestRepository } from "../repositories/HelpRequestRepository";
import { RequestStatus, type HelpRequestType } from "../db/schema";

export class HelpRequestService {
  async createHelpRequest(data: Partial<HelpRequestType>) {
    return await helpRequestRepository.create({
      ...data,
      status: "OPEN",
    });
  }
}

export const helpRequestService = new HelpRequestService();