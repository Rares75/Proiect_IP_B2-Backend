import { Resend } from "resend";
import { Mailer as MailerDecorator } from "../di/decorators/mailer";
import type { Mailer } from "./mailer.interface";

@MailerDecorator()
export class ProdMailer implements Mailer {
	private resend: Resend;
	constructor() {
		this.resend = new Resend(Bun.env.RESEND_API_KEY);
	}
	async send({
		to,
		subject,
		html,
	}: {
		to: string;
		subject: string;
		html: string;
	}) {
		await this.resend.emails.send({
			// biome-ignore lint/style/noNonNullAssertion: <for now>
			from: process.env.EMAIL_FROM!,
			to,
			subject,
			html,
		});
	}
}
