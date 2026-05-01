import { createMiddleware } from "hono/factory";
import type { Context, Next } from "hono";
import type { AppEnv } from "../app";
import { container } from "../di";
import { UserAccessService } from "../services/UserAccessService";
import { sendApiResponse } from "../utils/apiReponse";

// This middleware historically returned simple JSON errors. Keep that
// behaviour so tests and callers that expect `{ error: string }` keep
// working.
export const checkStatusMiddlware = async (c: Context<AppEnv>, next: Next) => {
	const userAccessService = container.get<UserAccessService>(UserAccessService);
	const user = c.get("user");

	if (!user) {
		//return c.json({ error: "Unauthorized" }, 401);
		return sendApiResponse(c, null, { kind: "unauthorized" });
	}

	const accountStatus = await userAccessService.checkUserStatus(user.id);

	if (accountStatus === "BLOCKED") {
		//return c.json({ error: "Unauthorized: Account is blocked" }, 403);
		return sendApiResponse(c, null, {
			statusCode: 403,
			message: "Unauthorized:Account is blocked",
		});
	}

	await next();
};

export const checkStatus = createMiddleware<AppEnv>(checkStatusMiddlware);
