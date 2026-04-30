import { Hono } from "hono";

import { inject } from "../di";
import { GuestSessionService } from "../services/GuestSessionService";
import { Controller } from "../utils/controller";

@Controller("/guest")
export class GuestController {
	constructor(
		@inject(GuestSessionService)
		private readonly guestSessionService: GuestSessionService,
	) {}

	controller = new Hono().post("/session", (c) => {
		const sessionId = this.guestSessionService.createSessionId();

		return c.json({ sessionId }, 201);
	});
}
