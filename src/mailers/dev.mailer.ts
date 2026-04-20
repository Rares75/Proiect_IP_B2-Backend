import { Mailer } from "./mailer.interface";
import { transporter } from "./transporter";

export class DevMailer implements Mailer {
  async send({ to, subject, html }: { to: string; subject: string; html: string }) {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });
  }
}