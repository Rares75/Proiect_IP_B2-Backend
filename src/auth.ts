import { betterAuth } from "better-auth";
import { emailOTP, openAPI, phoneNumber } from "better-auth/plugins";
import { db } from "./db";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { verifyEmailTemplate } from "./mailers/templates/verifyEmail";
import { signInTemplate } from "./mailers/templates/signIn";
import { resetPasswordTemplate } from "./mailers/templates/resetPassword";
import { logger } from "./utils/logger";
import * as schema from "./db/schema";
import { getMailer } from "./mailers/getMailer";
import { username } from "better-auth/plugins";
import { createAuthMiddleware } from "better-auth/api";
import { container } from "./di";
import { ProfileRepository } from "./db/repositories/profile.repository";

const profileRepository = container.get<ProfileRepository>(ProfileRepository);
const auth = betterAuth({
	user: {
		deleteUser: {
			enabled: true,
		},
	},
	baseURL: Bun.env.BETTER_AUTH_URL ?? "http://localhost:3000",
	database: drizzleAdapter(db, { provider: "pg", schema }),
	logger: {
		disableColors: false,
		disabled: false,
		level: "debug",
		log: (level, message, ...args) => {
			if (level === "error") {
				logger.error(
					`[AUTH_ERROR] ${message},
						${args.length ? JSON.stringify(args, null, 2) : ""}`,
				);
			} else {
				logger.info(`[AUTH_${level.toUpperCase()}] ${message}`);
			}
		},
	},

	emailAndPassword: {
		enabled: true,
	},

	advanced: {
		crossSubDomainCookies: { enabled: true },
		trustedProxies: (process.env.TRUSTED_PROXIES ?? "").split(","),
		trustedOrigins: (process.env.TRUSTED_ORIGINS ?? "").split(","),
		cookiePrefix: "my-app",
		useSecureCookies: false,
		cookies: {
			session_token: {
				name: "session_token",
				attributes: {
					httpOnly: true,
					secure: false,
					sameSite: "lax",
					maxAge: 60 * 60 * 24 * 7,
					path: "/",
				},
			},
		},
	},

	rateLimit: {
		enabled: true,
		window: 60 * 1000,
		max: 100,
	},

	emailVerification: {
		autoSignInAfterVerification: true,
		sendVerificationEmail: async ({ user }) => {
			await auth.api.sendVerificationOTP({
				body: {
					email: user.email,
					type: "email-verification",
				},
			});
		},
	},

	hooks: {
		after: createAuthMiddleware(async (ctx) => {
			if (ctx.path !== "/sign-up/email") return;

			const newUser = ctx.context.newSession?.user;
			if (!newUser) return;

			await profileRepository.create({ userId: newUser.id });
		}),
	},

	plugins: [
		username(),
		openAPI(),
		phoneNumber(),
		emailOTP({
			async sendVerificationOTP({ email, otp, type }) {
				const mailer = getMailer();
				try {
					if (type === "email-verification") {
						await mailer.send({
							to: email,
							subject: "Confirmare cont",
							html: verifyEmailTemplate(otp, 10),
						});
					} else if (type === "sign-in") {
						await mailer.send({
							to: email,
							subject: "Cod autentificare",
							html: signInTemplate(otp, 10),
						});
					} else {
						await mailer.send({
							to: email,
							subject: "Resetare parolă",
							html: resetPasswordTemplate(otp, 10),
						});
					}
				} catch (error) {
					console.error("EROARE SMTP:", error);
				}
			},
			expiresIn: 600,
		}),
	],
});

export default auth;
