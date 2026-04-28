import { Mailer as MailerDecorator } from "../di/decorators/mailer";
import { logger } from "../utils/logger";
import type { Mailer } from "./mailer.interface";
import { createTransport } from "nodemailer";
import { MailerException } from "../exceptions/mailer/MailerException";

@MailerDecorator()
export class DevMailer implements Mailer {
	private mailer: ReturnType<typeof createTransport>;
	constructor() {
		this.mailer = createTransport({
			url: "smtp://localhost:1025",
		});
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
			const result = await this.mailer.sendMail({
				from: process.env.EMAIL_FROM,
				to,
				subject,
				html,
			});

			if (result.rejected.length > 0) {
				throw new MailerException(
					`Failed to send email to ${to}: ${result.rejected.join(", ")}`,
				);
			}
		} catch (error) {
			logger.exception(error);
		}
	}
}
