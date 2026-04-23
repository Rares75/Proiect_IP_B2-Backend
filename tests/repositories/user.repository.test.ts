import { afterEach, describe, expect, test } from "bun:test";
import { db } from "../../src/db";
import { user } from "../../src/db/auth-schema";
import { UserRepository } from "../../src/db/repositories/user.repository";
import { container } from "../../src/di/container";

describe("UserRepository tests", () => {
	const userRepository = container.get(UserRepository);
	const originalSelect = (db as any).select;
	const originalInsert = (db as any).insert;
	const originalDelete = (db as any).delete;

	afterEach(() => {
		(db as any).select = originalSelect;
		(db as any).insert = originalInsert;
		(db as any).delete = originalDelete;
	});

	test("should create a new user", async () => {
		const input = {
			id: "user-1",
			name: "example user",
			email: "example@example.com",
			phone: "0744123456",
		};
		const expectedUser = { ...input, emailVerified: false };
		let insertedTable: unknown;
		let insertedValues: unknown;

		(db as any).insert = (table: unknown) => {
			insertedTable = table;
			return {
				values: (values: unknown) => {
					insertedValues = values;
					return {
						returning: async () => [expectedUser],
					};
				},
			};
		};

		const newUser = await userRepository.create(input as any);

		expect(newUser).toMatchObject(expectedUser);
		expect(insertedTable).toBe(user);
		expect(insertedValues).toEqual(input);
	});

	test("should find created user by id", async () => {
		const expectedUser = { id: "user-2", email: "example_2@example.com" };
		let fromTable: unknown;

		(db as any).select = () => ({
			from: (table: unknown) => {
				fromTable = table;
				return {
					where: async () => [expectedUser],
				};
			},
		});

		const foundUser = await userRepository.findById("user-2");

		expect(foundUser).toMatchObject(expectedUser);
		expect(fromTable).toBe(user);
	});

	test("should count users successfully", async () => {
		(db as any).select = () => ({
			from: async () => [{ value: 3 }],
		});

		const total = await userRepository.count();

		expect(total).toBe(3);
	});

	test("should delete created test user", async () => {
		let deletedTable: unknown;

		(db as any).delete = (table: unknown) => {
			deletedTable = table;
			return {
				where: () => ({
					returning: async () => [{ id: "user-3" }],
				}),
			};
		};
		(db as any).select = () => ({
			from: () => ({
				where: async () => [{ value: 0 }],
			}),
		});

		const isDeleted = await userRepository.delete("user-3");
		const exists = await userRepository.exists("user-3");

		expect(isDeleted).toBe(true);
		expect(exists).toBe(false);
		expect(deletedTable).toBe(user);
	});
});
