import type {
	ValidationErrorItem,
	ValidationErrorResponse,
} from "../types/validation.types";

export const buildSafeValidationResponse = (
	errors: ValidationErrorItem[],
): ValidationErrorResponse => ({
	errors,
});
