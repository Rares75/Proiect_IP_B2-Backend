import { Hono } from "hono";
import { Controller } from "../utils/controller";
import { helpRequestService } from "../services/HelpRequestService";

@Controller("/tasks")
export class HelpRequestController {
  static controller = new Hono()
    .post("/", async (c) => {
      try {
        const body = await c.req.json();
        const result = await helpRequestService.createHelpRequest(body);
        return c.json(result, 201);
      } catch (error) {
        return c.json({ message: "Internal server error" }, 500);
      }
    })
    .delete("/:id/details", async (c) => {
      try {
        const id = Number(c.req.param("id"));
        const result = await helpRequestService.deleteHelpRequestDetails(id);

        if (result.status === 204) {
          return c.body(null, 204);
        }

        return c.json(result.body, result.status);
      } catch (error) {
        return c.json({ message: "Internal server error" }, 500);
      }
    });
}
