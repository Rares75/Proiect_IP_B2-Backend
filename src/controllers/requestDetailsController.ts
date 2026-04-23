import { Hono } from "hono";
import { Controller } from "../utils/controller";
import { helpRequestDetailsService } from "../services/RequestDetailsService";

@Controller("/tasks")
export class HelpRequestDetailsController {
    static controller = new Hono()
        .post("/:id/details", async (c) => {
            try {
                const id = Number(c.req.param("id"));
                const body = await c.req.json();

                const result = await helpRequestDetailsService.upsertDetails(id, body);

                if (result.notFound) {
                    return c.json({ message: "Task not found" }, 404);
                }

                return c.json(result.data, 200);
            } catch (error) {
                return c.json({ message: "Could not update help request details" }, 500);
            }
        });
}