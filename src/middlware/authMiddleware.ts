import { createMiddleware } from "hono/factory";
import type { Context, Next } from "hono";
import auth from "../auth";
import type { AppEnv } from "../app";
import { sendApiResponse } from "../utils/apiReponse";

// Middlewares should return simple, traditional error payloads (not the
// full API envelope) because many tests expect the historic shape
// { error: string } when authentication fails.
export const authMiddlware = async (c: Context<AppEnv>, next: Next) => {
	const sessionData = await auth.api.getSession({ headers: c.req.raw.headers });

	if (!sessionData?.user || !sessionData?.session) {
		// Return the original simple JSON error used before the introduction
		// of the API envelope helper.
		//return c.json({ error: "Unauthorized" }, 401);
		return sendApiResponse(c, null, { kind: "unauthorized" });
	}

	c.set("session", sessionData.session);
	c.set("user", sessionData.user);

	await next();
};

export const authMiddleware = createMiddleware<AppEnv>(authMiddlware);
