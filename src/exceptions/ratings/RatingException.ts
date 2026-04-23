export class RatingException extends Error {
	constructor(message: string, cause?: Error) {
		super(message, {
			cause,
		});
		this.name = "RatingException";
	}
}
