import { createAuthMiddleware } from "better-auth/api";
import auth from "../auth";

export const twoFactorMiddleware = createAuthMiddleware(async (ctx) => {
	if (ctx.path !== "/api/auth/sign-in/email") return;
	await auth.api.sendVerificationOTP({
		body: {
			email: ctx.body.email,
			type: "sign-in",
		},
	});
});
