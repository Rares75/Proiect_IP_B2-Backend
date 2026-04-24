export class ContainerException extends Error {
	constructor(message: string, cause?: Error) {
		super(message, { cause });
		this.name = "ContainerException";
	}
}
