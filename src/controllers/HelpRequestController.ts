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
	});
}
