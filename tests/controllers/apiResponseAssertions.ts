import { expect } from "bun:test";

export const API_RESPONSE_KEYS = [
	"data",
	"message",
	"notFound",
	"isUnauthorized",
	"isServerError",
	"isClientError",
	"app",
	"statusCode",
] as const;

export const expectApiEnvelope = (body: any, statusCode: number) => {
	expect(Object.keys(body).sort()).toEqual([...API_RESPONSE_KEYS].sort());
	expect(body.statusCode).toBe(statusCode);
	expect(body).toHaveProperty("data");
	expect(body).toHaveProperty("message");
	expect(body).toHaveProperty("notFound");
	expect(body).toHaveProperty("isUnauthorized");
	expect(body).toHaveProperty("isServerError");
	expect(body).toHaveProperty("isClientError");
	expect(body).toHaveProperty("app");
};

export const expectSuccessApiResponse = (
	body: any,
	data: unknown,
	statusCode = 200,
) => {
	expectApiEnvelope(body, statusCode);
	expect(body.data).toEqual(data);
	expect(body.notFound).toBe(false);
	expect(body.isUnauthorized).toBe(false);
	expect(body.isServerError).toBe(false);
	expect(body.isClientError).toBe(false);
};

export const expectClientErrorApiResponse = (
	body: any,
	message: string,
	statusCode = 400,
) => {
	expectApiEnvelope(body, statusCode);
	expect(body.data).toBeNull();
	expect(body.message).toBe(message);
	expect(body.notFound).toBe(false);
	expect(body.isUnauthorized).toBe(false);
	expect(body.isServerError).toBe(false);
	expect(body.isClientError).toBe(true);
};

export const expectNotFoundApiResponse = (
	body: any,
	message: string,
	statusCode = 404,
) => {
	expectApiEnvelope(body, statusCode);
	expect(body.data).toBeNull();
	expect(body.message).toBe(message);
	expect(body.notFound).toBe(true);
	expect(body.isUnauthorized).toBe(false);
	expect(body.isServerError).toBe(false);
	expect(body.isClientError).toBe(false);
};

export const expectServerErrorApiResponse = (
	body: any,
	message = "Internal server error",
	statusCode = 500,
) => {
	expectApiEnvelope(body, statusCode);
	expect(body.data).toBeNull();
	expect(body.message).toBe(message);
	expect(body.notFound).toBe(false);
	expect(body.isUnauthorized).toBe(false);
	expect(body.isServerError).toBe(true);
	expect(body.isClientError).toBe(false);
};
