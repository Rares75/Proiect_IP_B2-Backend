import { Resend } from "resend";
import { Mailer } from "./mailer.interface";
import { verifyEmailTemplate } from "./templates/verifyEmail";
import { signInTemplate } from "./templates/signIn";
import { resetPasswordTemplate } from "./templates/resetPassword";

const resend = new Resend(process.env.RESEND_API_KEY);

export class ProdMailer implements Mailer {
  async sendVerificationEmail(to: string, otp: string) {
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to,
      subject: "Confirmare cont",
      html: verifyEmailTemplate(otp, 10),
    });
  }

  async sendSignInEmail(to: string, otp: string) {
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to,
      subject: "Cod autentificare",
      html: signInTemplate(otp, 10),
    });
  }

  async sendResetPasswordEmail(to: string, otp: string) {
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to,
      subject: "Resetare parolă",
      html: resetPasswordTemplate(otp, 10),
    });
  }
}