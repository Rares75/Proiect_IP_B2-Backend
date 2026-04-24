import { createMiddleware } from "hono/factory";
import type { Context, Next } from "hono";
import type { AppEnv } from "../app";
import { container } from "../di";
import { UserAccessService } from "../services/UserAccessService";

export const checkStatusMiddlware = async (c: Context<AppEnv>, next: Next) => {
	const userAccessService = container.get<UserAccessService>(UserAccessService);
	const user = c.get("user");

	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const accountStatus = await userAccessService.checkUserStatus(user.id);

	if (accountStatus === "BLOCKED") {
		return c.json({ error: "Unauthorized: Account is blocked" }, 403);
	}

	await next();
};

export const checkStatus = createMiddleware<AppEnv>(checkStatusMiddlware);
