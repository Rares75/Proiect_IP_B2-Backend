import app from "./app";
import {drizzle} from 'drizzle-orm/node-postgres'
import { parseEnv } from "./env";

parseEnv();

export const db = drizzle(Bun.env.DATABASE_URL);

const server = Bun.serve({
	port: Bun.env.PORT || 3001,
	hostname: "0.0.0.0",
	fetch: app.fetch,
});

console.log(`Server running on http://localhost:${server.port}`);
