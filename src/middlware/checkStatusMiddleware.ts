import { createMiddleware } from "hono/factory";
import type { Context, Next } from "hono";
import type { AppEnv } from "../app";
import { container } from "../di";
import { UserAccessService } from "../services/UserAccessService";
import { sendApiResponse } from "../utils/apiReponse";

export const checkStatusMiddlware = async (c: Context<AppEnv>, next: Next) => {
	const userAccessService = container.get<UserAccessService>(UserAccessService);
	const user = c.get("user");

	if (!user) {
		return sendApiResponse(c, null, { kind: "unauthorized" });
	}

	const accountStatus = await userAccessService.checkUserStatus(user.id);

	if (accountStatus === "BLOCKED") {
		return sendApiResponse(c, null, {
			kind: "forbidden",
		});
	}

	await next();
};

export const checkStatus = createMiddleware<AppEnv>(checkStatusMiddlware);
