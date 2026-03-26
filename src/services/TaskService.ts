import type { TaskStatus } from "@server/db/schema";

const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
    OPEN:    ["CLAIMED"],
    CLAIMED: ["DONE"],
    DONE:    [],
};


export class TaskService {


    async updateTaskStatus(taskId: string, newStatus: TaskStatus) {
        //implementez dupa
    }

}

//the service is instantiated and exported as a singleton. The controller imports that and never calls new TaskService()
export const taskService = new TaskService();