import { Resend } from "resend";
import { Mailer } from "./mailer.interface";

const resend = new Resend(process.env.RESEND_API_KEY);

export class ProdMailer implements Mailer {
  async send({ to, subject, html }: { to: string; subject: string; html: string }) {
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to,
      subject,
      html,
    });
  }
}