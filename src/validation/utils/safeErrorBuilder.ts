import type {
	ValidationErrorItem,
	ValidationErrorResponse,
} from "../types/validation.types";

export const buildSafeValidationResponse = (
	errors: ValidationErrorItem[],
): ValidationErrorResponse => ({
	// Expunem doar campurile sigure pentru client, fara detalii interne despre implementare.
	errors,
});
