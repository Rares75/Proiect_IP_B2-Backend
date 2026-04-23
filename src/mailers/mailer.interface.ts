export interface Mailer {
	send(options: { to: string; subject: string; html: string }): Promise<void>;
}
