import { Hono } from "hono";
import { logger } from "hono/logger";
import { authMiddleware } from "./middlware/authMiddleware";
import { checkStatus } from "./middlware/checkStatusMiddleware";
import type { AuthUserType, SessionType } from "./types";

export type AppEnv = {
	Variables: {
		session: SessionType;
		user: AuthUserType;
	};
};

const app = new Hono<AppEnv>()
	.basePath("/api")
	.use(logger())
	.use("/*", authMiddleware)
	.use("/*", checkStatus);

(globalThis as any).app = app;

export default app;
