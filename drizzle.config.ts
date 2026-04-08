import { defineConfig } from "drizzle-kit";

export default defineConfig({
	out: "./drizzle",
	schema: "./src/db/schema.ts",
	dialect: "postgresql",
	dbCredentials: {
		// biome-ignore lint/style/noNonNullAssertion: <drizzle docs>
		url: process.env.DATABASE_URL!,
	},
	extensionsFilters: ["postgis"],
});
