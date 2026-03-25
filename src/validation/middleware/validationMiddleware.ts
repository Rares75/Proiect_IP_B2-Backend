import { createMiddleware } from "hono/factory";

import { defaultValidationConfig } from "../config/validation.config";
import { RequestValidationError } from "../errors/validationError";
import type {
	ValidationConfig,
	ValidationMiddlewareFactory,
} from "../types/validation.types";
import { buildSafeValidationResponse } from "../utils/safeErrorBuilder";
import { validateRequest } from "../validators/validateRequest";

// Completam configuratia primita din exterior peste valorile implicite ale modulului.
const mergeConfig = (
	config?: Partial<ValidationConfig>,
): ValidationConfig => ({
	...defaultValidationConfig,
	...config,
});

// Validarea ruleaza doar pe metodele care pot transporta un body relevant.
const shouldValidateRequest = (
	method: string,
	config: ValidationConfig,
): boolean => config.validateMethods.includes(method as never);

export const createValidationMiddleware: ValidationMiddlewareFactory = (
	schema,
	config,
) => {
	const resolvedConfig = mergeConfig(config);

	return createMiddleware(async (context, next) => {
		if (!shouldValidateRequest(context.req.method, resolvedConfig)) {
			await next();
			return;
		}

		try {
			await validateRequest(context, schema);
		} catch (error) {
			if (error instanceof RequestValidationError) {
				// Erorile controlate sunt transformate intr-un raspuns sigur si predictibil pentru client.
				return context.json(
					buildSafeValidationResponse(error.errors),
					error.statusCode,
				);
			}

			// Fallback defensiv pentru orice eroare neasteptata aparuta in timpul validarii.
			return context.json(
				buildSafeValidationResponse([
					{
						field: "body",
						message: "Request body validation failed",
					},
				]),
				resolvedConfig.statusCode,
			);
		}

		await next();
	});
};
