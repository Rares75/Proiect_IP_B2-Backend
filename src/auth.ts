import { betterAuth } from "better-auth";
import { emailOTP, openAPI } from "better-auth/plugins"
import { db } from "./db";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "./db/auth-schema";
import { getMailer } from "./mailers";
const mailer = getMailer();
import { verifyEmailTemplate } from "./mailers/templates/verifyEmail";
import { signInTemplate } from "./mailers/templates/signIn";
import { resetPasswordTemplate } from "./mailers/templates/resetPassword";


export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),

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
    max: 10,
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
    openAPI(),
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
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