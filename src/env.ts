import * as z from "zod";

export const envSchema = z.object({
	DATABASE_URL: z.string(),
});

export function parseEnv() {
	try {
		envSchema.parse(Bun.env);
	} catch (e) {
    console.error(e);
    process.exit(1);
	}
}

declare module "bun" {
	interface Env extends z.TypeOf<typeof envSchema> {}
}
