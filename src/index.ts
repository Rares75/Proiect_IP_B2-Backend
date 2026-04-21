import "./utils/pretty-error";
import app from "./app";
import { parseEnv } from "./env";
import { loadControllers } from "./utils/controller";
import { join } from "node:path";

await loadControllers(join(import.meta.dir, "controllers"));
parseEnv();

const server = Bun.serve({
	port: Bun.env.PORT || 3000,
	hostname: "0.0.0.0",
	fetch: app.fetch,
});

const hostname = server.hostname === "0.0.0.0" ? "localhost" : server.hostname;
console.log(`Server running on http://${hostname}:${server.port}`);
