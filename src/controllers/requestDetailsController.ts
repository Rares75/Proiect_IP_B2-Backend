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

	controller = new Hono().delete("/:id/details", async (c) => {
		try {
			const id = Number(c.req.param("id"));

			if (!Number.isInteger(id) || id <= 0) {
				return c.json({ message: "Invalid task id." }, 400);
			}

			const result = await this.requestDetailsService.deleteHelpRequestDetails(id);

			if (result.status === 204) {
				return c.body(null, 204);
			}

			return c.json(result.body, result.status);
		} catch (error) {
			console.error(error);
			return c.json({ message: "Internal server error" }, 500);
		}
	});
}
