import type { ValidationConfig } from "../types/validation.types";

export const defaultValidationConfig: ValidationConfig = {
	statusCode: 400,
	validateMethods: ["POST", "PUT", "PATCH"],
};
