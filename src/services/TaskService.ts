import { taskRepository } from "../repositories/TaskRepository";

export class TaskService {
  async getTaskById(id: number) {
    try {
      return await taskRepository.findById(id); 
    } catch (error) {
      console.error("Eroare la DB:", error);
      return null;
    }
  }
}
export const taskService = new TaskService();