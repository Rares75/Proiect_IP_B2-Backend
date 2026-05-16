import { changeEmailTemplate } from "../../mailers/templates/changeEmail";
import { resetPasswordTemplate } from "../../mailers/templates/resetPassword";
import { signInTemplate } from "../../mailers/templates/signIn";
import { verifyEmailTemplate } from "../../mailers/templates/verifyEmail";

export type SendVerificationRequestType =
	| "email-verification"
	| "sign-in"
	| "forget-password"
	| "change-email";

export function getTemplateByType(type: SendVerificationRequestType) {
	switch (type) {
		case "email-verification":
			return {
				template: verifyEmailTemplate,
				subject: "Verify your email address",
			};
		case "sign-in":
			return { template: signInTemplate, subject: "Sign in to your account" };
		case "forget-password":
			return {
				template: resetPasswordTemplate,
				subject: "Reset your password",
			};
		case "change-email":
			return {
				template: changeEmailTemplate,
				subject: "Change your email address",
			};
	}
}
