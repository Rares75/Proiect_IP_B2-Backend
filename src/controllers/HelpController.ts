import { Hono } from "hono";
import type { AppEnv } from "../app";

import { Controller } from "../utils/controller";
import { authMiddlware } from "../middlware/authMiddleware";
import {
	createValidationMiddleware,
	helpRequestInputSchema,
	requestDetailsSchema,
	validationMiddleware,
} from "../validation";

@Controller("/help")
export class HelpController {
	controller = new Hono<AppEnv>()
		.use("*", authMiddlware)
		.use("/", validationMiddleware)
		.use("/helpRequest", createValidationMiddleware(helpRequestInputSchema))
		.use("/requestDetails", createValidationMiddleware(requestDetailsSchema))
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
