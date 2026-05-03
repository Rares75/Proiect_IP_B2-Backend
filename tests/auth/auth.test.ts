import { describe, test, expect } from "bun:test";
import auth from "../../src/auth";
import { container } from "../../src/di";
import { ProfileService } from "../../src/services/ProfileService";

const TEST_USER = {
	name: "Test User",
	email: "testauth@mail.com",
	password: "Password123!",
};

describe("Sign Up", () => {
	let createdUserId: string;
	test("creates a new user", async () => {
		const res = await auth.api.signUpEmail({
			body: TEST_USER,
		});

		expect(res.user).toBeDefined();
		expect(res.user.email).toBe(TEST_USER.email);
		createdUserId = res.user.id;
	});

	test("after signup a profile is created by the db hook", async () => {
		const profileService = container.get<ProfileService>(ProfileService);
		const profile = await profileService.getProfileByUserId(createdUserId);

		expect(profile).toBeDefined();
		expect(profile.userId).toBe(createdUserId);
	});
	test("fails with invalid email", async () => {
		expect(
			auth.api.signUpEmail({
				body: {
					name: "Test User",
					email: "invalid-email",
					password: "Password123!",
				},
			}),
		).rejects.toThrow();
	});

	test("fails with missing password", async () => {
		expect(
			auth.api.signUpEmail({
				body: {
					name: "Test User",
					email: "testauth2@mail.com",
					password: "",
				},
			}),
		).rejects.toThrow();
	});

	test("returns existing user on duplicate email", async () => {
		const res = await auth.api.signUpEmail({ body: TEST_USER });
		expect(res.user.email).toBe(TEST_USER.email);
	});
});

describe("Sign In", () => {
	test("fails when email is not verified", async () => {
		expect(
			auth.api.signInEmail({
				body: {
					email: TEST_USER.email,
					password: TEST_USER.password,
				},
			}),
		).rejects.toThrow();
	});

	test("fails with wrong password", async () => {
		expect(
			auth.api.signInEmail({
				body: {
					email: TEST_USER.email,
					password: "WrongPassword123!",
				},
			}),
		).rejects.toThrow();
	});

	test("fails with non-existent email", async () => {
		expect(
			auth.api.signInEmail({
				body: {
					email: "nonexistent@mail.com",
					password: "Password123!",
				},
			}),
		).rejects.toThrow();
	});

	test("fails with empty email", async () => {
		expect(
			auth.api.signInEmail({
				body: {
					email: "",
					password: TEST_USER.password,
				},
			}),
		).rejects.toThrow();
	});
});

describe("Email OTP", () => {
	test("sends verification OTP for email-verification type", async () => {
		const res = await auth.api.sendVerificationOTP({
			body: { email: TEST_USER.email, type: "email-verification" },
		});
		expect(res).toBeDefined();
	});

	test("sends OTP for sign-in type", async () => {
		const res = await auth.api.sendVerificationOTP({
			body: { email: TEST_USER.email, type: "sign-in" },
		});
		expect(res).toBeDefined();
	});

	test("sends OTP for forget-password type", async () => {
		const res = await auth.api.sendVerificationOTP({
			body: { email: TEST_USER.email, type: "forget-password" },
		});
		expect(res).toBeDefined();
	});

	test("fails with invalid OTP", async () => {
		expect(
			auth.api.verifyEmailOTP({
				body: {
					email: TEST_USER.email,
					otp: "000000",
				},
			}),
		).rejects.toThrow();
	});

	test("fails OTP verification with wrong email", async () => {
		expect(
			auth.api.verifyEmailOTP({
				body: {
					email: "wrong@mail.com",
					otp: "000000",
				},
			}),
		).rejects.toThrow();
	});
});

describe("Two Factor", () => {
	test("enable 2FA fails without session", async () => {
		expect(
			auth.api.enableTwoFactor({
				headers: new Headers(),
				body: { password: TEST_USER.password },
			}),
		).rejects.toThrow();
	});

	test("disable 2FA fails without session", async () => {
		expect(
			auth.api.disableTwoFactor({
				headers: new Headers(),
				body: { password: TEST_USER.password },
			}),
		).rejects.toThrow();
	});
});

describe("Username", () => {
	test("sign in with username fails when email not verified", async () => {
		expect(
			auth.api.signInUsername({
				body: {
					username: "testuser",
					password: TEST_USER.password,
				},
			}),
		).rejects.toThrow();
	});

	test("check username availability returns response", async () => {
		const res = await auth.api.isUsernameAvailable({
			body: { username: "testuser" },
		});
		expect(res).toBeDefined();
	});
});

describe("Sign Out", () => {
	test("sign out without session returns response", async () => {
		const res = await auth.api.signOut({ headers: new Headers() });
		expect(res).toBeDefined();
	});
});
describe("Change Email OTP", () => {
	test("request email change fails without session", async () => {
		expect(
			auth.api.requestEmailChangeEmailOTP({
				headers: new Headers(),
				body: { newEmail: "newemail@mail.com" },
			}),
		).rejects.toThrow();
	});

	test("change email fails with invalid OTP", async () => {
		expect(
			auth.api.changeEmailEmailOTP({
				headers: new Headers(),
				body: { newEmail: "newemail@mail.com", otp: "000000" },
			}),
		).rejects.toThrow();
	});
});
