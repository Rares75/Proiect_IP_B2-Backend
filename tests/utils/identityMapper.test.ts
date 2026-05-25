import { describe, expect, test } from "bun:test";
import {
	createAnonymousAlias,
	mapUserIdentity,
} from "../../src/utils/identityMapper";

describe("identityMapper", () => {
	const hiddenIdentity = {
		userId: "user-hidden",
		name: "Ion Popescu",
		email: "ion@example.com",
		phone: "0744000000",
		image: "https://example.com/avatar.png",
		username: "ionpop",
		hiddenIdentity: true,
	};

	test("hides sensitive fields from other users", () => {
		const result = mapUserIdentity(hiddenIdentity, { userId: "other-user" });

		expect(result.name).toBeNull();
		expect(result.email).toBeNull();
		expect(result.phone).toBeNull();
		expect(result.image).toBeNull();
		expect(result.username).toBeNull();
		expect(result.id).toBe(createAnonymousAlias("user-hidden"));
		expect(result.alias).toBe(createAnonymousAlias("user-hidden"));
		expect(result.isIdentityHidden).toBe(true);
	});

	test("shows real identity to the owner", () => {
		const result = mapUserIdentity(hiddenIdentity, { userId: "user-hidden" });

		expect(result.id).toBe("user-hidden");
		expect(result.name).toBe("Ion Popescu");
		expect(result.email).toBe("ion@example.com");
		expect(result.phone).toBe("0744000000");
		expect(result.username).toBe("ionpop");
		expect(result.isIdentityHidden).toBe(true);
	});

	test("shows real identity to admins", () => {
		const result = mapUserIdentity(hiddenIdentity, {
			userId: "admin-user",
			role: "admin",
		});

		expect(result.id).toBe("user-hidden");
		expect(result.name).toBe("Ion Popescu");
		expect(result.email).toBe("ion@example.com");
	});
});
