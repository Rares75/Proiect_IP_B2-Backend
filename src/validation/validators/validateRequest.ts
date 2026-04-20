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
		// Cererea ajunge aici cand body-ul nu poate fi parse-at ca JSON valid.
		throw new RequestValidationError([
			{
				field: "body",
				message: invalidJsonError,
			},
		]);
	}

	if (parsedBody === null || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
		// Acceptam doar obiecte JSON, nu null, primitive sau array-uri.
		throw new RequestValidationError([
			{
				field: "body",
				message: emptyBodyError,
			},
		]);
	}

	if (Object.keys(parsedBody).length === 0) {
		// Un obiect gol nu poate satisface o schema care valideaza date de input reale.
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
			// Standardizam erorile Zod intr-o exceptie aplicativa folosita de middleware.
			throw new RequestValidationError(formatValidationIssues(error.issues));
		}

		throw error;
	}
};
