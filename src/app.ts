import { Hono } from "hono";

import type { AuthUserType, SessionType } from "./types";

export type AppEnv = {
	Variables: {
		session: SessionType;
		user: AuthUserType;
	};
};

const app = new Hono<AppEnv>().basePath("/api");

(globalThis as any).app = app;

export default app;
