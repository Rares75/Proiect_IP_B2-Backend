import { createMiddleware } from "hono/factory";
import type { Context, Next } from "hono";
import { accountService } from "../services/AccountService";
import type { AppEnv } from "../app";

export const checkStatusMiddlware = async (c: Context<AppEnv>, next: Next) => {
	const user = c.get("user");

	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const accountStatus = await accountService.checkUserStatus(user.id);

	if (accountStatus === "BLOCKED") {
		return c.json({ error: "Unauthorized: Account is blocked" }, 403);
	}

	await next();
};

export const checkStatus = createMiddleware<AppEnv>(checkStatusMiddlware);
