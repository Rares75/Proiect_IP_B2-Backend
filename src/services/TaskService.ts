import { taskRepository } from "../repositories/TaskRepository";

export class TaskService {
  async getTaskById(id: string) {
    try {
      return await taskRepository.getOne(id);
    } catch (error) {
      console.error("Eroare la DB:", error);
      return null;
    }
  }
}
export const taskService = new TaskService();