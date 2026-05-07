import { Hono } from "hono";
import { cors } from "hono/cors";
import { container } from "./di/container";
import type { AuthUserType, SessionType } from "./types";
import { getAllowedOrigins } from "./utils/origins";

export type AppEnv = {
	Variables: {
		session: SessionType;
		user: AuthUserType;
	};
};

const app = new Hono<AppEnv>().basePath("/api").use(
	cors({
		origin: getAllowedOrigins(),
		allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		credentials: true,
	}),
);

container.addConstant("app", app);

export default app;
