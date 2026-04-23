import {inject} from "../di";
import {Service} from "../di/decorators/service";
import {HelpRequestRepository} from "../db/repositories/helpRequests.repository";
import {
    HelpRequestDetailsRepository,
    type UpdateHelpRequestDetailsDTO,
} from "../db/repositories/requestDetails.repository";

@Service()
export class HelpRequestDetailsService {
    constructor(
        @inject(HelpRequestRepository)
        private readonly helpRequestRepo: HelpRequestRepository,
        @inject(HelpRequestDetailsRepository)
        private readonly requestDetailsRepo: HelpRequestDetailsRepository,
    ) {
    }

    async upsertDetails(helpRequestId: number, data: UpdateHelpRequestDetailsDTO) {
        try {
            // Verifica daca task-ul parinte exista
            const taskExists = await this.helpRequestRepo.exists(helpRequestId);
            if (!taskExists) {
                return {notFound: true, data: null};
            }

            // Verifica daca details exista deja pentru acest task
            const existing = await this.requestDetailsRepo.findByHelpRequestId(helpRequestId);

            if (existing) {
                // Daca exista -> update
                const updated = await this.requestDetailsRepo.updateByHelpRequestId(helpRequestId, data);
                return {notFound: false, data: updated};
            } else {
                // Daca nu exista -> create
                const created = await this.requestDetailsRepo.create({
                    ...data,
                    helpRequestId,
                });
                return {notFound: false, data: created};
            }
        } catch (error) {
            console.error("Failed to upsert help request details:", error);
            throw new Error("Could not update help request details");
        }
    }
}

//evitam exportul singleton din repo, la fel cum a-ti facut in HElpRequest