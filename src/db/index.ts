import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL not found");
}

export const db = drizzle({
	connection: process.env.DATABASE_URL,
	schema,
});
