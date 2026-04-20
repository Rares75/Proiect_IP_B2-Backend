import type { Hono } from "hono";

import { helpRequestInputSchema } from "../schemas/helpRequest.schema";
import type { ValidationSchema } from "../types/validation.types";
import { createValidationMiddleware } from "./validationMiddleware";

export const registerValidation = (
	app: Hono,
	// Daca nu este injectata o schema, folosim contractul standard pentru cererile de help.
	schema: ValidationSchema = helpRequestInputSchema,
): Hono => {
	app.use("*", createValidationMiddleware(schema));
	return app;
};
