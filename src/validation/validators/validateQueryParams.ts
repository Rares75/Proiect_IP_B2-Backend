import type { Context } from "hono";
import { ZodError } from "zod";

import { formatValidationIssues } from "../errors/errorFormatter";
import { RequestValidationError } from "../errors/validationError";
import type {
	ValidationErrorItem,
	ValidationSchema,
} from "../types/validation.types";

const hasQueryValue = (value: unknown): boolean => value !== undefined;

const addMissingCoordinateErrors = (
	queryParams: Record<string, unknown>,
	errors: ValidationErrorItem[],
): void => {
	const hasLatitude = hasQueryValue(queryParams.lat);
	const hasLongitude = hasQueryValue(queryParams.lng);

	if (hasLatitude && !hasLongitude) {
		errors.push({
			field: "lng",
			message: "Longitude is required when latitude is provided",
		});
	}

	if (hasLongitude && !hasLatitude) {
		errors.push({
			field: "lat",
			message: "Latitude is required when longitude is provided",
		});
	}
};

export const validateQueryParams = async (
	context: Context,
	schema: ValidationSchema,
): Promise<void> => {
	const queryParams = {
		...context.req.query(),
		...(context.req.queries("skill")
			? { skill: context.req.queries("skill") }
			: {}),
	};

	try {
		const result = await schema.safeParseAsync(queryParams);
		const errors = result.success
			? []
			: formatValidationIssues(result.error.issues);

		addMissingCoordinateErrors(queryParams, errors);

		if (errors.length > 0) {
			throw new RequestValidationError(errors);
		}
	} catch (error) {
		if (error instanceof RequestValidationError) {
			throw error;
		}

		if (error instanceof ZodError) {
			const errors = formatValidationIssues(error.issues);
			addMissingCoordinateErrors(queryParams, errors);
			throw new RequestValidationError(errors);
		}

		throw error;
	}
};
