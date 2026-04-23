import {
    HelpRequestRepository,
    type CreateHelpRequestDTO,
} from "../db/repositories/helpRequests.repository";
import {HelpRequestDetailsRepository} from "../db/repositories/requestDetails.repository";
import {inject} from "../di";
import {Service} from "../di/decorators/service";

@Service()
export class HelpRequestService {
    constructor(
        @inject(HelpRequestRepository)
        private readonly helpRequestRepo: HelpRequestRepository,
        @inject(HelpRequestDetailsRepository)
        private readonly helpRequestDetailsRepo: HelpRequestDetailsRepository,
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
     * Retrieves a task with the specified ID and includes the associated details (if any)
     *
     * @param id The ID of the help request task
     * @returns An object containing the task data and the `details` field (null if no details exist)
     */
    async getHelpRequestById(id: number) {
        //fetch the main task
        const helpRequest = await this.helpRequestRepo.findById(id);

        //if the task doesn't exist, I return `undefined` (the controller will handle the 404)
        if (!helpRequest) {
            return undefined
        }

        //Get the details associated with the task
        const details = await this.helpRequestDetailsRepo.findByHelpRequestId(id);

        return {
            ...helpRequest,
            details: details || null,
        };

    }

}
