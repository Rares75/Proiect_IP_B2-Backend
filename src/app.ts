import { Hono } from "hono";
import { cors } from "hono/cors";
import { container } from "./di/container";
import type { AuthUserType, SessionType } from "./types";

export type AppEnv = {
	Variables: {
		session: SessionType;
		user: AuthUserType;
	};
};

const app = new Hono<AppEnv>().basePath("/api").use(
	cors({
		origin: [Bun.env.CLIENT_URL, Bun.env.SERVER_URL],
		allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		credentials: true,
	}),
);

container.addConstant("app", app);

export default app;
