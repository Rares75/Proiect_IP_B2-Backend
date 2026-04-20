import { Mailer } from "./mailer.interface";
import { transporter } from "./transporter";
import { verifyEmailTemplate } from "./templates/verifyEmail";
import { signInTemplate } from "./templates/signIn";
import { resetPasswordTemplate } from "./templates/resetPassword";

export class DevMailer implements Mailer {
  async sendVerificationEmail(to: string, otp: string) {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject: "Confirmare cont",
      html: verifyEmailTemplate(otp, 10),
    });
  }

  async sendSignInEmail(to: string, otp: string) {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject: "Cod autentificare",
      html: signInTemplate(otp, 10),
    });
  }

  async sendResetPasswordEmail(to: string, otp: string) {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject: "Resetare parolă",
      html: resetPasswordTemplate(otp, 10),
    });
  }
}