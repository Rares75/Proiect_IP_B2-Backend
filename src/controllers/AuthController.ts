import { Hono } from "hono";
import { Controller } from "../utils/controller";
import auth from "../auth";

// This controller is a catch-all for any /auth/* routes and forwards them to the auth handler.DO NOT ALTER.
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
