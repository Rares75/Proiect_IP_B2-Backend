import { HTTPException } from "hono/http-exception";
import {
	resolver,
	uniqueSymbol,
	validator as openApiValidator,
} from "hono-openapi";
import { buildSafeValidationResponse } from "../../validation";
import { sendApiResponse } from "../apiReponse";
import type { Context, Next } from "hono";

type StandardSchemaIssue = {
	message: string;
	path?: readonly (PropertyKey | { key: PropertyKey })[];
};

const invalidJsonMessage = "Request body must be valid JSON";

const normalizeIssuePath = (
	path?: readonly (PropertyKey | { key: PropertyKey })[],
) => {
	if (!path?.length) {
		return "body";
	}

	return path
		.map((segment) =>
			typeof segment === "object" && segment !== null && "key" in segment
				? String(segment.key)
				: String(segment),
		)
		.join(".");
};

export const buildValidationErrorData = (
	issues: readonly StandardSchemaIssue[],
) =>
	buildSafeValidationResponse(
		issues.map((issue) => ({
			field: normalizeIssuePath(issue.path),
			message: issue.message,
		})),
	);

export const validator: typeof openApiValidator = ((
	target,
	schema,
	hook,
	options,
) => {
	const middleware = openApiValidator(target, schema, hook, options);

	if (target !== "json") {
		return middleware;
	}

	const wrapped = async (c: Context, next: Next) => {
		try {
			return await middleware(c, next);
		} catch (error) {
			if (
				error instanceof HTTPException &&
				error.status === 400 &&
				error.message === "Malformed JSON in request body"
			) {
				return sendApiResponse(c, null, {
					kind: "clientError",
					message: invalidJsonMessage,
				});
			}

			throw error;
		}
	};

	return Object.assign(wrapped, {
		[uniqueSymbol]: {
			target,
			...resolver(schema, options),
			options,
		},
	});
}) as typeof openApiValidator;
