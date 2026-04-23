import { createMiddleware } from "hono/factory";

import { defaultValidationConfig } from "../config/validation.config";
import { RequestValidationError } from "../errors/validationError";
import { queryParamsSchema } from "../schemas/queryParams.schema";
import type {
	ValidationConfig,
	ValidationMiddlewareFactory,
} from "../types/validation.types";
import { buildSafeValidationResponse } from "../utils/safeErrorBuilder";
import { validateQueryParams } from "../validators/validateQueryParams";

const mergeConfig = (config?: Partial<ValidationConfig>): ValidationConfig => ({
	...defaultValidationConfig,
	...config,
});

export const createQueryValidationMiddleware: ValidationMiddlewareFactory = (
	schema,
	config,
) => {
	const resolvedConfig = mergeConfig(config);

	return createMiddleware(async (context, next) => {
		if (context.req.method !== "GET") {
			await next();
			return;
		}

		try {
			await validateQueryParams(context, schema);
		} catch (error) {
			if (error instanceof RequestValidationError) {
				return context.json(
					buildSafeValidationResponse(error.errors),
					error.statusCode,
				);
			}

			return context.json(
				buildSafeValidationResponse([
					{
						field: "query",
						message: "Query parameter validation failed",
					},
				]),
				resolvedConfig.statusCode,
			);
		}

		await next();
	});
};

export const queryValidationMiddleware =
	// TODO(BE1-19): attach this to the first production GET route that accepts
	// filtering, sorting, pagination, or geolocation query params; current
	// controllers only expose path params, so there is no production wiring point yet.
	createQueryValidationMiddleware(queryParamsSchema);
