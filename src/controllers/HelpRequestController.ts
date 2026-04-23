import { Hono } from "hono";
import { Controller } from "../utils/controller";
import { inject } from "../di";
import { HelpRequestService } from "../services/HelpRequestService";

@Controller("/tasks")
export class HelpRequestController {
	constructor(
		@inject(HelpRequestService)
		private readonly helpRequestService: HelpRequestService,
	) {}

	controller = new Hono().post("/", async (c) => {
		try {
			const body = await c.req.json();
			const result = await this.helpRequestService.createHelpRequest(body);
			return c.json(result, 201);
		} catch {
			return c.json({ message: "Internal server error" }, 500);
		}
	})

   

    .get("/:id", async (c) => {
      try {
        const idParam = c.req.param("id");
        const requestedId = Number(idParam);

      
        if (!Number.isInteger(requestedId) || requestedId <= 0 || requestedId > Number.MAX_SAFE_INTEGER) {
          return c.json(
            { success: false, message: "Eroare: ID-ul furnizat este invalid. Trebuie sa fie un numar intreg pozitiv." },
            400
          );
        }

        
        const foundTask = await this.helpRequestService.getHelpRequestById(requestedId);

        
        if (!foundTask || (Array.isArray(foundTask) && foundTask.length === 0)) {
          return c.json(
            { success: false, message: `Eroare: Task-ul cu ID-ul '${requestedId}' nu exista in sistem.` },
            404
          );
        }

        const dataToReturn = Array.isArray(foundTask) ? foundTask[0] : foundTask;
        return c.json({ success: true, data: dataToReturn }, 200);

      } catch (error) {
        console.error(`Eroare critica la GET /tasks/${c.req.param("id")} :`, error);
        return c.json(
          { success: false, message: "Eroare interna a serverului. Va rugam incercati mai tarziu." },
          500
        );
      }
    });

}
