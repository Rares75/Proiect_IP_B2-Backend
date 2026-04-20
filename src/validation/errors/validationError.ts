import type {
	ValidationErrorItem,
	ValidationErrorResponse,
} from "../types/validation.types";

export class RequestValidationError extends Error {
	public readonly errors: ValidationErrorItem[];
	public readonly statusCode: 400;

	public constructor(errors: ValidationErrorItem[], statusCode: 400 = 400) {
		super("Request validation failed");
		this.name = "RequestValidationError";
		this.errors = errors;
		this.statusCode = statusCode;
	}

	public toResponseBody(): ValidationErrorResponse {
		return {
			errors: this.errors,
		};
	}
}
