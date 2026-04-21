import { Mailer as MailerDecorator } from "../di/decorators/mailer";
import type { Mailer } from "./mailer.interface";
import { createTransport } from "nodemailer";

@MailerDecorator()
export class DevMailer implements Mailer {
	private mailer: ReturnType<typeof createTransport>;
	constructor() {
		this.mailer = createTransport({
			host: "gmail",
			port: 587,
			auth: {
				user: process.env.GMAIL_USER,
				pass: process.env.GMAIL_APP_PASSWORD,
			},
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
		this.mailer.sendMail({
			from: process.env.EMAIL_FROM,
			to,
			subject,
			html,
		});
	}
}
