import { Hono } from "hono";
import { logger } from "hono/logger";
const app = new Hono().basePath("/api").use(logger());
(globalThis as any).app = app;

export default app;