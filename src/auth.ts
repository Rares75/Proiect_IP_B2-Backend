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
import { ProfileService } from "./services/ProfileService";
import { twoFactor } from "better-auth/plugins";

const profileRepository = container.get<ProfileRepository>(ProfileRepository);
const auth = betterAuth({
	appName: "My App",
	baseURL: process.env.BETTER_AUTH_URL,
	user: {
		deleteUser: {
			enabled: true,
			afterDelete: async (ctx) => {
				const profileService = container.get<ProfileService>(ProfileService);
				const result = await profileService.deleteProfile(ctx.id);
				if (!result) {
					logger.error(`Failed to delete profile for user ${ctx.id}`);
				} else {
					logger.info(`Deleted profile for user ${ctx.id}`);
				}
			},
		},
		additionalFields: {
			isAnonymus: {
				type: "boolean",
				defaultValue: false,
			},
		},
	},
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
		requireEmailVerification: true,
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
		max: 1000,
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

			const result = await profileRepository.create({ userId: newUser.id });
			logger.info(JSON.stringify(result));
		}),
	},

	plugins: [
		twoFactor({
			issuer: "My App",
			otpOptions: {
				async sendOTP({ user, otp }) {
					const mailer = getMailer();
					await mailer.send({
						to: user.email,
						subject: "2 Factor Authentification Code",
						html: signInTemplate(otp, 10),
					});
				},
			},
		}),
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
					} else if (type === "forget-password") {
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
