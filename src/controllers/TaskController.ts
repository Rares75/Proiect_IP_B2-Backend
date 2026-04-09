import { Hono } from "hono";
import { Controller } from "../utils/controller";
import { taskService } from "../services/TaskService";

@Controller("/tasks")
export class TaskController {
    static controller = new Hono()
        .get("/:id", async (c) => {
            const paramId = c.req.param("id");
            const requestedId = parseInt(paramId, 10); 

            if (Number.isNaN(requestedId)) {
                 return c.json({ success: false, message: "Eroare: ID-ul furnizat trebuie sa fie un numar." }, 400);
            }

            const foundTask = await taskService.getTaskById(requestedId);

            if (!foundTask) {
                return c.json({ success: false, message: `Eroare: Task-ul cu ID-ul '${requestedId}' nu a fost gasit` }, 404);
            }
            
            return c.json({ success: true, data: foundTask }, 200);
        });
}