import {
	helpRequestRepository,
	type CreateHelpRequestDTO,
} from "../db/repositories/helpRequests.repository";

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
}

export const helpRequestService = new HelpRequestService();
