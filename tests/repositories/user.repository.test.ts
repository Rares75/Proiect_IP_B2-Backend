import { expect, test, describe } from "bun:test";

import { userRepository } from "../../src/db/repositories/user.repository";

describe("UserRepository tests", () => {
	let testUserId: string;

	test("should create a new user", async () => {
		const newUser = await userRepository.create({
			id: crypto.randomUUID(),
			name: "example user",
			userName: `example_${Date.now()}`,
			email: `example_${Date.now()}@example.com`,
			phone: "0744123456",
		});

		expect(newUser).toBeDefined();
		expect(newUser.name).toBe("example user");
		expect(newUser.id).toBeTypeOf("string");

		// save for the next tests
		testUserId = newUser.id;
	});

	test("should find created user by id", async () => {
		const foundUser = await userRepository.findById(testUserId);
		expect(foundUser).toBeDefined();
		expect(foundUser?.email).toContain("example_");
	});

	test("should count users successfully", async () => {
		const total = await userRepository.count();
		expect(total).toBeGreaterThan(0);
	});

	test("should delete created test user", async () => {
		const isDeleted = await userRepository.delete(testUserId);
		expect(isDeleted).toBe(true);

		const exists = await userRepository.exists(testUserId);
		expect(exists).toBe(false);
	});
});
