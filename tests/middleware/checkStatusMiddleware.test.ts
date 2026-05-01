import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { container } from "../../src/di";
import { expectApiEnvelope } from "../controllers/apiResponseAssertions";

type AccountStatus = "ACTIVE" | "BLOCKED" | null;

let checkUserStatus = async (_userId: string): Promise<AccountStatus> =>
	"ACTIVE";

const originalGet = container.get;

const { checkStatusMiddlware } = await import(
	"../../src/middlware/checkStatusMiddleware"
);

describe("checkStatusMiddleware", () => {
	beforeEach(() => {
		container.get = (() => ({
			checkUserStatus: (userId: string) => checkUserStatus(userId),
		})) as typeof container.get;
	});

	afterEach(() => {
		checkUserStatus = async () => "ACTIVE";
		container.get = originalGet;
	});

	test("returns 401 when the context does not contain a user", async () => {
		let nextCalled = false;
		let statusChecked = false;

		checkUserStatus = async () => {
			statusChecked = true;
			return "ACTIVE";
		};

		const response = await checkStatusMiddlware(
			{
				get: () => undefined,
				json: (body: unknown, status: number) =>
					Response.json(body, { status }),
			} as any,
			async () => {
				nextCalled = true;
			},
		);

		expect(response?.status).toBe(401);
		const body: any = await response?.json();
		expectApiEnvelope(body, 401);
		expect(body).toMatchObject({
			data: null,
			message: "Unauthorized",
			notFound: false,
			isUnauthorized: true,
			isServerError: false,
			isClientError: false,
			statusCode: 401,
		});
		expect(nextCalled).toBe(false);
		expect(statusChecked).toBe(false);
	});

	test("returns 403 when the user account is blocked", async () => {
		let nextCalled = false;

		checkUserStatus = async () => "BLOCKED";

		const response = await checkStatusMiddlware(
			{
				get: () => ({ id: "user-1" }),
				json: (body: unknown, status: number) =>
					Response.json(body, { status }),
			} as any,
			async () => {
				nextCalled = true;
			},
		);

		expect(response?.status).toBe(403);
		const body: any = await response?.json();
		expectApiEnvelope(body, 403);
		expect(body).toMatchObject({
			data: null,
			message: "Unauthorized:Account is blocked",
			notFound: false,
			isUnauthorized: false,
			isServerError: false,
			isClientError: true,
			statusCode: 403,
		});
		expect(nextCalled).toBe(false);
	});

	test("continues to the next middleware when the account is not blocked", async () => {
		let nextCalled = false;

		checkUserStatus = async () => "ACTIVE";

		const response = await checkStatusMiddlware(
			{
				get: () => ({ id: "user-2" }),
				json: (body: unknown, status: number) =>
					Response.json(body, { status }),
			} as any,
			async () => {
				nextCalled = true;
			},
		);

		expect(response).toBeUndefined();
		expect(nextCalled).toBe(true);
	});
});
