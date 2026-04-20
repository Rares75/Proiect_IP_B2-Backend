import { Hono } from "hono";

import { Controller } from "../utils/controller";
import { validationMiddleware } from "../validation";

@Controller("/help")
export class HelpController {
	static controller = new Hono()
		.use("*", validationMiddleware)
		.post("/", async (c) => {
			const body = await c.req.json();

			return c.json({
				ok: true,
				body,
			});
		});
}
