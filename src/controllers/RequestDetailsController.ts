import { Hono } from "hono";
import { Controller } from "../utils/controller";
import { inject } from "../di";
import { HelpRequestDetailsService } from "../services/RequestDetailsService";

@Controller("/tasks")
export class HelpRequestDetailsController {
	//aici la fel bagam constructorul si thi. in fata la tate aparitiile helpRequestDetailsService
	constructor(
		@inject(HelpRequestDetailsService)
		private readonly helpRequestDetailsService: HelpRequestDetailsService,
	) {}

	controller = new Hono().post("/:id/details", async (c) => {
		try {
			const id = Number(c.req.param("id"));
			const body = await c.req.json();

			const result = await this.helpRequestDetailsService.upsertDetails(
				id,
				body,
			);

			if (result.notFound) {
				return c.json({ message: "Task not found" }, 404);
			}

			return c.json(result.data, 200);
		} catch (_error) {
			return c.json({ message: "Could not update help request details" }, 500);
		}
	});
}
