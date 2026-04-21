import { afterEach, describe, expect, mock, test } from "bun:test";

type AccountStatus = "ACTIVE" | "BLOCKED" | null;

let checkUserStatus = async (_userId: string): Promise<AccountStatus> =>
	"ACTIVE";

mock.module("../../src/services/AccountService", () => ({
	AccountService: class AccountService {},
	accountService: {
		checkUserStatus: (userId: string) => checkUserStatus(userId),
	},
}));

const { checkStatusMiddlware } = await import(
	"../../src/middlware/checkStatusMiddleware"
);

describe("checkStatusMiddleware", () => {
	afterEach(() => {
		checkUserStatus = async () => "ACTIVE";
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
		expect(await response?.json()).toEqual({ error: "Unauthorized" });
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
		expect(await response?.json()).toEqual({
			error: "Unauthorized: Account is blocked",
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
