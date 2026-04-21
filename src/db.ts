import { drizzle } from "drizzle-orm/node-postgres";

// biome-ignore lint/style/noNonNullAssertion: <trust me>
export const db = drizzle(process.env.DATABASE_URL!);
