import { helpRequestRepository } from "../db/repositories/helpRequests.repository";

export class TaskService {
  async getTaskById(id: number) {
    return await helpRequestRepository.findById(id); 
  }
}
export const taskService = new TaskService();