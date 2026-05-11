import * as z from "zod";
import pe from "./utils/pretty-error";

export const envSchema = z.object({
	NODE_ENV: z.enum(["development", "production"]).default("development"),
	SERVER_URL: z.string(),
	DATABASE_URL: z.string(),
	BETTER_AUTH_URL: z.string(),
	BETTER_AUTH_SECRET: z.string(),
	GMAIL_USER: z.string().optional(),
	GMAIL_APP_PASSWORD: z.string().optional(),
	EMAIL_FROM: z.string().optional(),
	TRUSTED_ORIGINS: z.string().optional(),
	TRUSTED_PROXIES: z.string().optional(),
	CLIENT_URL: z.string(),
	R2_ENDPOINT: z.string(),
	R2_ACCESS_KEY: z.string(),
	R2_SECRET_ACCESS_KEY: z.string(),
	R2_TOKEN: z.string(),
	R2_DOMAIN: z.string(),
	R2_BUCKET_NAME: z.string(),
	R2_BUCKET: z.string(),
});

export function parseEnv() {
	try {
		envSchema.parse(Bun.env);
	} catch (e) {
		if (e instanceof Error) {
			console.error(pe.render(e));
		} else {
			console.error(e);
		}
		process.exit(1);
	}
}

declare module "bun" {
	interface Env extends z.TypeOf<typeof envSchema> {}
}

declare module "process" {
	interface Env extends z.TypeOf<typeof envSchema> {}
}
//Ca sa puteti folosi process.env sau Bun.env si sa aveti 100% type safety
//Ideal ar fi sa folosim Bun.env dar exista exceptii.
