import { Hono } from "hono";
import { Controller } from "../utils/controller";
import { auth } from "../auth";

@Controller("/")
export class AuthController {
	static controller = new Hono().on(
		["POST", "GET", "PUT", "DELETE"],
		"/auth/*",
		(c) => {
			return auth.handler(c.req.raw);
		},
	);
}
