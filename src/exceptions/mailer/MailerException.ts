export class MailerException extends Error {
	constructor(message: string, cause?: Error) {
		super(message, { cause });
		this.name = "MailerException";
	}
}
