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

    .get("/:id", async (c) => {
      const idParam = c.req.param("id");
      const requestedId = parseInt(idParam, 10);

      if (Number.isNaN(requestedId)) {
        return c.json(
          { success: false, message: "Eroare: ID-ul furnizat trebuie sa fie un numar." },
          400
        );
      }

      try {
        const foundTask = await helpRequestService.getHelpRequestById(requestedId);

        if (!foundTask) {
          return c.json(
            { success: false, message: `Eroare: Task-ul cu ID-ul '${idParam}' nu a fost gasit` },
            404
          );
        }

        return c.json({ success: true, data: foundTask }, 200);
      } catch (error) {
        console.error("Eroare interna de server:", error);
        return c.json({ success: false, message: "Eroare interna a serverului." }, 500);
      }
    });


}