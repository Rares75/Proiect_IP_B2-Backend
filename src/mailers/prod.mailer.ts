import { Resend } from "resend";
import type { Mailer } from "./mailer.interface";

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
