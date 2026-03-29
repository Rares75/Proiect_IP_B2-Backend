import { Hono } from "hono";
import { Controller } from "../utils/controller";
import { taskService } from "../services/TaskService";

@Controller("/tasks")
export class TaskController {
    static controller = new Hono()
        .get("/:id", async (c) => {
            const requestedId = c.req.param("id");
            const foundTask = await taskService.getTaskById(requestedId);

            if (!foundTask) {
                // Aici am adaugat statusul 404
                return c.json({ success: false, message: `Eroare: Task-ul cu ID-ul '${requestedId}' nu a fost gasit` }, 404);
            }
            
            return c.json({ success: true, data: foundTask }, 200);
        });
}