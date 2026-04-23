import type { Context } from "hono";
import { ZodError } from "zod";

import { formatValidationIssues } from "../errors/errorFormatter";
import { RequestValidationError } from "../errors/validationError";
import type { ValidationSchema } from "../types/validation.types";

export const validateQueryParams = async (
	context: Context,
	schema: ValidationSchema,
): Promise<void> => {
	try {
		await schema.parseAsync(context.req.query());
	} catch (error) {
		if (error instanceof ZodError) {
			throw new RequestValidationError(formatValidationIssues(error.issues));
		}

		throw error;
	}
};
