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
import { twoFactor } from "better-auth/plugins";
import { changeEmailTemplate } from "./mailers/templates/changeEmail";
import { ProfileService } from "./services/ProfileService";
import { container } from "./di";
import { getAllowedOrigins } from "./utils/origins";

const isProduction = Bun.env.NODE_ENV === "production";
const sessionCookieSameSite = isProduction ? "none" : "lax";
const trustedOrigins = getAllowedOrigins();

const auth = betterAuth({
	appName: "My App",
	baseURL: Bun.env.BETTER_AUTH_URL,
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
	database: drizzleAdapter(db, { provider: "postgresql", schema }),
	databaseHooks: {
		user: {
			create: {
				after: async (createdUser) => {
					const profileService = container.get<ProfileService>(ProfileService);
					const profile = await profileService.createProfile(createdUser.id, {
						name: createdUser.name,
						image: createdUser.image || "",
					});

					logger.info(
						`Created profile for user ${createdUser.id} with id ${profile.userId}`,
					);
				},
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
	},

	trustedOrigins,
	advanced: {
		useSecureCookies: true,
		defaultCookieAttributes: {
			sameSite: "none",
			secure: true,
		},
		cookies: {
			session_token: {
				attributes: {
					httpOnly: true,
					secure: true,
					sameSite: "none",
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
			sendVerificationOnSignUp: true,
			storeOTP: "hashed",
			otpLength: 6,
			allowedAttempts: 3,
			changeEmail: {
				enabled: true,
			},
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
					} else if (type === "change-email") {
						await mailer.send({
							to: email,
							subject: "Confirmare schimbare email",
							html: changeEmailTemplate(otp, 10),
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
