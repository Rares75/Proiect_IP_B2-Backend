import { helpRequestDetailsRepository as requestDetailsRepository, type UpdateHelpRequestDetailsDTO } from "../db/repositories/requestDetails.repository";
import { helpRequestRepository } from "../db/repositories/helpRequests.repository";

export class HelpRequestDetailsService {
    async upsertDetails(helpRequestId: number, data: UpdateHelpRequestDetailsDTO) {
        try {
            // Verifica daca task-ul parinte exista
            const taskExists = await helpRequestRepository.exists(helpRequestId);
            if (!taskExists) {
                return { notFound: true, data: null };
            }

            // Verifica daca details exista deja pentru acest task
            const existing = await requestDetailsRepository.findByHelpRequestId(helpRequestId);

            if (existing) {
                // Daca exista -> update
                const updated = await requestDetailsRepository.updateByHelpRequestId(helpRequestId, data);
                return { notFound: false, data: updated };
            } else {
                // Daca nu exista -> create
                const created = await requestDetailsRepository.create({
                    ...data,
                    helpRequestId,
                });
                return { notFound: false, data: created };
            }
        } catch (error) {
            console.error("Failed to upsert help request details:", error);
            throw new Error("Could not update help request details");
        }
    }
}

export const helpRequestDetailsService = new HelpRequestDetailsService();