import {
	HelpRequestRepository,
	type CreateHelpRequestDTO,
} from "../db/repositories/helpRequests.repository";
import { inject } from "../di";
import { Service } from "../di/decorators/service";

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


  async getHelpRequestById(id: number) {
    return await this.helpRequestRepo.findById(id);
  }
  
}
