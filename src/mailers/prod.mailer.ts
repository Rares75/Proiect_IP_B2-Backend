import { Resend } from "resend";
import { Mailer as MailerDecorator } from "../di/decorators/mailer";
import type { Mailer } from "./mailer.interface";
import { MailerException } from "../exceptions/mailer/MailerException";
import { logger } from "../utils/logger";

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
		try {
			const res = await this.resend.emails.send({
				// biome-ignore lint/style/noNonNullAssertion: <for now>
				from: Bun.env.EMAIL_FROM!,
				to,
				subject,
				html,
			});
			if (res.error) {
				throw new MailerException(res.error.message);
			}
		} catch (error) {
			logger.exception(error);
		}
	}
}
