import { Hono } from "hono";
import { Controller } from "../utils/controller";
import { inject } from "../di";
import { RequestDetailsService } from "../services/RequestDetailsService";

@Controller("/tasks")
export class RequestDetailsController {
	constructor(
		@inject(RequestDetailsService)
		private readonly requestDetailsService: RequestDetailsService,
	) {}

	controller = new Hono()
		.post("/:id/details", async (c) => {
			try {
				const id = Number(c.req.param("id"));
				const body = await c.req.json();

				const result = await this.requestDetailsService.upsertDetails(id, body);

				if (result.notFound) {
					return c.json({ message: "Task not found" }, 404);
				}

				return c.json(result.data, 200);
			} catch (_error) {
				return c.json({ message: "Could not update help request details" }, 500);
			}
		})
		.delete("/:id/details", async (c) => {
			const id = Number(c.req.param("id"));
			const result = await this.requestDetailsService.deleteHelpRequestDetails(id);

			if (result.status === 204) {
				return c.body(null, 204);
			}

			return c.json(result.body, result.status);
		});
}

export { RequestDetailsController as HelpRequestDetailsController };
