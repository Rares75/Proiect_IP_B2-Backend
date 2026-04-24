import { Hono } from "hono";

import { Controller } from "../utils/controller";
import {
	createValidationMiddleware,
	helpRequestInputSchema,
	requestDetailsSchema,
	validationMiddleware,
} from "../validation";

@Controller("/help")
export class HelpController {
	controller = new Hono()
		.use("/", validationMiddleware)
		.use(
			"/helpRequest",
			createValidationMiddleware(helpRequestInputSchema),
		)
		.use(
			"/requestDetails",
			createValidationMiddleware(requestDetailsSchema),
		)
		.post("/", async (c) => {
			const body = await c.req.json();

			return c.json(body);
		})
		.post("/helpRequest", async (c) => {
			const body = await c.req.json();

			return c.json(body);
		})
		.post("/requestDetails", async (c) => {
			const body = await c.req.json();

			return c.json(body);
		});
}
