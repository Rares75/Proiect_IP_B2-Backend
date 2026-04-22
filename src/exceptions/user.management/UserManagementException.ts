export class UsermanagementException extends Error {
	constructor(message: string, cause?: Error) {
		super(message, {
			cause,
		});
		this.name = "UsermanagementException";
	}
}
