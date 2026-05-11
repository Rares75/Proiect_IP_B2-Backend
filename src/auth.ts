import { betterAuth } from "better-auth";
import { emailOTP, openAPI, phoneNumber } from "better-auth/plugins";
import { db } from "./db";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { signInTemplate } from "./mailers/templates/signIn";
import { logger } from "./utils/logger";
import * as schema from "./db/schema";
import { getMailer } from "./mailers/getMailer";
import { username } from "better-auth/plugins";
import { twoFactor } from "better-auth/plugins";
import { sendVerificationOTP } from "./utils/auth/sendVerificationOTPHandler";
import { createUserProfileHook } from "./utils/auth/hooks/createProfileHook";

const auth = betterAuth({
	appName: "Micro-Volunteer Crisis Router",
	baseURL: process.env.BETTER_AUTH_URL,
	user: {
		changeEmail: {
			enabled: true,
		},
		additionalFields: {
			isAnonymus: {
				type: "boolean",
				defaultValue: false,
			},
		},
	},
	database: drizzleAdapter(db, { provider: "pg", schema }),
	databaseHooks: {
		user: {
			create: {
				after: createUserProfileHook,
			},
		},
	},
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

	trustedOrigins: [Bun.env.CLIENT_URL, Bun.env.SERVER_URL],
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

	plugins: [
		twoFactor({
			issuer: "Micro-Volunteer Crisis Router",
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
			changeEmail: {
				enabled: true,
			},
			sendVerificationOTP,
			expiresIn: 600,
		}),
	],
});

export default auth;
