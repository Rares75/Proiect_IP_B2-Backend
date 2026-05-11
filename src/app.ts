import { Hono } from "hono";
import { cors } from "hono/cors";
import { rateLimiter } from "hono-rate-limiter";
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

app.use(
	"*",
	rateLimiter({
		windowMs: 1 * 60 * 1000, // Max 100 Request-uri per minut
		limit: 100,
		keyGenerator: (c) => c.req.header("x-forwarded-for") ?? "unknown",
	}),
);

app.use(
	"/guest/session",
	rateLimiter({
		windowMs: 15 * 60 * 1000,
		limit: 10,
		keyGenerator: (c) => c.req.header("x-forwarded-for") ?? "unknown",
	}),
);

container.addConstant("app", app);

export default app;
