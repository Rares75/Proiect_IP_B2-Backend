import type { Context } from "hono";
import { ZodError } from "zod";

import { formatValidationIssues } from "../errors/errorFormatter";
import { RequestValidationError } from "../errors/validationError";
import type {
	JsonObject,
	RequestBodyParser,
	ValidationSchema,
} from "../types/validation.types";

const invalidJsonError = "Request body must be a valid JSON object";
const emptyBodyError = "Request body is required";

const parseJsonBody: RequestBodyParser = async (context: Context) => {
	let parsedBody: unknown;

	try {
		parsedBody = await context.req.json();
	} catch {
		throw new RequestValidationError([
			{
				field: "body",
				message: invalidJsonError,
			},
		]);
	}

	if (parsedBody === null || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
		throw new RequestValidationError([
			{
				field: "body",
				message: emptyBodyError,
			},
		]);
	}

	if (Object.keys(parsedBody).length === 0) {
		throw new RequestValidationError([
			{
				field: "body",
				message: emptyBodyError,
			},
		]);
	}

	return parsedBody as JsonObject;
};

export const validateRequest = async (
	context: Context,
	schema: ValidationSchema,
): Promise<void> => {
	const parsedBody = await parseJsonBody(context);

	try {
		await schema.parseAsync(parsedBody);
	} catch (error) {
		if (error instanceof ZodError) {
			throw new RequestValidationError(formatValidationIssues(error.issues));
		}

		throw error;
	}
};
