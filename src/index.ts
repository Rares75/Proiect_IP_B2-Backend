import "./utils/pretty-error";
import app, { websocket } from "./app";
import { parseEnv } from "./env";
import { loadDiModules } from "./di/loadModules";
import { loadControllers } from "./utils/controller";
import { join } from "node:path";
import { logger } from "./utils/logger";
//import { websocket } from "hono/bun";
import * as Sentry from "@sentry/bun";
import "./db/redis";

Sentry.init({
	dsn: Bun.env.SENTRY_DSN,
	environment: Bun.env.NODE_ENV,
	// Send structured logs to Sentry
	enableLogs: true,
});

await loadDiModules(
	join(import.meta.dir, "db", "repositories"),
	join(import.meta.dir, "services"),
	join(import.meta.dir, "mailers"),
);
await loadControllers(join(import.meta.dir, "controllers"));

parseEnv();

const server = Bun.serve({
	port: Bun.env.PORT || 3000,
	hostname: "::",
	fetch: (request, server) => app.fetch(request, { server }),
	websocket,
});

const hostname = server.hostname === "0.0.0.0" ? "localhost" : server.hostname;
logger.success(`Server running on http://${hostname}:${server.port}`);
