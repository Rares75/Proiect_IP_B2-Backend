import type { ContentfulStatusCode } from "hono/utils/http-status";

type ApiResponseKind =
	| "success"
	| "created"
	| "noContent"
	| "notFound"
	| "unauthorized"
	| "clientError"
	| "serverError";

type CreateApiResponseOptions = {
	message?: string;
	url?: string;
	kind?: ApiResponseKind;
	statusCode?: ApiResponseStatusCode;
};

export type ApiResponseStatusCode = ContentfulStatusCode | 204;

export type ApiResponseType<T> = {
	data: T | null;
	message?: string;
	notFound: boolean;
	isUnauthorized: boolean;
	isServerError: boolean;
	isClientError: boolean;
	app: {
		url: string;
	};
	statusCode: ApiResponseStatusCode;
};

const statusCodeByKind = {
	success: 200,
	created: 201,
	noContent: 204,
	notFound: 404,
	unauthorized: 401,
	clientError: 400,
	serverError: 500,
} as const satisfies Record<ApiResponseKind, ApiResponseStatusCode>;

const messageByKind = {
	success: "Request completed successfully",
	created: "Resource created successfully",
	noContent: "No content",
	notFound: "Resource not found",
	unauthorized: "Unauthorized",
	clientError: "Invalid request",
	serverError: "Internal server error",
} as const satisfies Record<ApiResponseKind, string>;

const inferKind = <T>(
	data: T | null,
	options: CreateApiResponseOptions,
): ApiResponseKind => {
	if (options.kind) {
		return options.kind;
	}

	if (options.statusCode === 204) {
		return "noContent";
	}
	if (options.statusCode === 401) {
		return "unauthorized";
	}
	if (options.statusCode === 404) {
		return "notFound";
	}
	if (options.statusCode && options.statusCode >= 500) {
		return "serverError";
	}
	if (options.statusCode && options.statusCode >= 400) {
		return "clientError";
	}
	if (options.statusCode === 201) {
		return "created";
	}

	return data === null ? "notFound" : "success";
};

export const createApiResponse = <T>(
	data: T | null,
	options: CreateApiResponseOptions = {},
): ApiResponseType<T> => {
	const kind = inferKind(data, options);
	const statusCode = options.statusCode ?? statusCodeByKind[kind];

	return {
		data,
		message: options.message ?? messageByKind[kind],
		notFound: kind === "notFound",
		isUnauthorized: kind === "unauthorized",
		isServerError: kind === "serverError",
		isClientError: kind === "clientError",
		app: {
			url: Bun.env.SERVER_URL,
		},
		statusCode,
	};
};
