import type { Context, MiddlewareHandler } from "hono";
import type { ZodIssue, ZodTypeAny } from "zod";

export type ValidationSchema = ZodTypeAny;

export type ValidationErrorItem = {
	field: string;
	message: string;
};

export type ValidationErrorResponse = {
	errors: ValidationErrorItem[];
};

export type ValidationMethod = "POST" | "PUT" | "PATCH";

export type ValidationConfig = {
	statusCode: 400;
	validateMethods: readonly ValidationMethod[];
};

export type ValidationErrorFormatter = (issues: ZodIssue[]) => ValidationErrorItem[];

export type ValidationMiddlewareFactory = (
	schema: ValidationSchema,
	config?: Partial<ValidationConfig>,
) => MiddlewareHandler;

export type JsonValue =
	| string
	| number
	| boolean
	| null
	| JsonObject
	| JsonValue[];

export type JsonObject = {
	[key: string]: JsonValue;
};

export type RequestBodyParser = (context: Context) => Promise<JsonObject>;
