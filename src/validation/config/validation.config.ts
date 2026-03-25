import type { ValidationConfig } from "../types/validation.types";

export const defaultValidationConfig: ValidationConfig = {
	statusCode: 400,
	// Limitam validarea la request-urile care trimit in mod normal body.
	validateMethods: ["POST", "PUT", "PATCH"],
};
