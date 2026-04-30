import { describe, test, expect } from "bun:test";
import auth from "../../src/auth";

describe("Register", () => {
	test("creates a new user", async () => {
		const res = await auth.api.signUpEmail({
			body: {
				name: "Test User",
				email: "test@mail.com",
				password: "Password123!",
			},
		});

		expect(res.user).toBeDefined();
	});

	test("fails with invalid email", async () => {
		await expect(
			auth.api.signUpEmail({
				body: {
					name: "Test User2",
					email: "invalid",
					password: "Password123!",
				},
			}),
		).rejects.toThrow();
	});
});
