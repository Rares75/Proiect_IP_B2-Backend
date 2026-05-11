import "./utils/pretty-error";
import app, { websocket } from "./app";
import { parseEnv } from "./env";
import { loadDiModules } from "./di/loadModules";
import { loadControllers } from "./utils/controller";
import { join } from "node:path";
import { logger } from "./utils/logger";

await loadDiModules(
	join(import.meta.dir, "db", "repositories"),
	join(import.meta.dir, "services"),
	join(import.meta.dir, "mailers"),
);
await loadControllers(join(import.meta.dir, "controllers"));

parseEnv();

const server = Bun.serve({
	port: Bun.env.PORT || 3000,
	hostname: "0.0.0.0",
	fetch: (request, server) => app.fetch(request, { server }),
	websocket,
});

const hostname = server.hostname === "0.0.0.0" ? "localhost" : server.hostname;
logger.success(`Server running on http://${hostname}:${server.port}`);
