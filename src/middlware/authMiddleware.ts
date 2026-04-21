import { createMiddleware } from "hono/factory";
import type { Context, Next } from "hono";
import auth from "../auth";
import type { AppEnv } from "../app";

export const authMiddlware = async (c: Context<AppEnv>, next: Next) => {
	const sessionData = await auth.api.getSession({ headers: c.req.raw.headers });

	if (!sessionData?.user || !sessionData?.session) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	c.set("session", sessionData.session);
	c.set("user", sessionData.user);

	await next();
};

export const authMiddleware = createMiddleware<AppEnv>(authMiddlware);
