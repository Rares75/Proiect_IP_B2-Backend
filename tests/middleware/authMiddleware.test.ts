import { afterEach, describe, expect, test } from "bun:test";
import auth from "../../src/auth";
import { authMiddlware } from "../../src/middlware/authMiddleware";

describe("authMiddleware", () => {
	const originalGetSession = auth.api.getSession;

	afterEach(() => {
		(auth.api as any).getSession = originalGetSession;
	});

	test("returns 401 when the request has no authenticated session", async () => {
		(auth.api as any).getSession = async () => null;

		let nextCalled = false;
		const response = await authMiddlware(
			{
				req: { raw: { headers: new Headers() } },
				json: (body: unknown, status: number) =>
					Response.json(body, { status }),
				set: () => {},
			} as any,
			async () => {
				nextCalled = true;
			},
		);

		expect(response?.status).toBe(401);
		expect(await response?.json()).toEqual({ error: "Unauthorized" });
		expect(nextCalled).toBe(false);
	});

	test("stores the session and user in context before calling next", async () => {
		const fakeSession = {
			id: "session-1",
			userId: "user-1",
			token: "token-1",
			createdAt: new Date(),
			updatedAt: new Date(),
			expiresAt: new Date(),
			ipAddress: null,
			userAgent: null,
		};
		const fakeUser = {
			id: "user-1",
			name: "Test User",
			email: "test@example.com",
			emailVerified: false,
			image: null,
			createdAt: new Date(),
			updatedAt: new Date(),
			userName: "test-user",
			phone: null,
		};
		const storedValues = new Map<string, unknown>();
		let nextCalled = false;

		(auth.api as any).getSession = async () => ({
			session: fakeSession,
			user: fakeUser,
		});

		const response = await authMiddlware(
			{
				req: { raw: { headers: new Headers() } },
				json: (body: unknown, status: number) =>
					Response.json(body, { status }),
				set: (key: string, value: unknown) => {
					storedValues.set(key, value);
				},
			} as any,
			async () => {
				nextCalled = true;
			},
		);

		expect(response).toBeUndefined();
		expect(nextCalled).toBe(true);
		expect(storedValues.get("session")).toEqual(fakeSession);
		expect(storedValues.get("user")).toEqual(fakeUser);
	});
});
