import { Hono } from "hono";

import { container } from "./di/container";
import type { AuthUserType, SessionType } from "./types";

export type AppEnv = {
	Variables: {
		session: SessionType;
		user: AuthUserType;
	};
};

const app = new Hono<AppEnv>().basePath("/api");

container.addConstant("app", app);

export default app;
