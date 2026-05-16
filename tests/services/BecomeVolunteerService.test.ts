import { beforeEach, afterEach, describe, expect, test } from "bun:test";
import { db } from "../../src/db";
import { NotFoundError } from "../../src/utils/Errors";
import { BecomeVolunteerService } from "../../src/services/BecomeVolunteerService";

describe("BecomeVolunteerService", () => {
	let service: BecomeVolunteerService;
	let mockVolunteerRepo: any;
	let mockUserRepo: any;
	const originalTransaction = (db as any).transaction;

	const makeTx = (overrides: any = {}) => ({
		insert: () => ({
			values: () => ({
				returning: async () => [
					{ id: 1, userId: "user-1", availability: false },
				],
			}),
		}),
		update: () => ({
			set: () => ({
				where: async () => [],
			}),
		}),
		...overrides,
	});

	beforeEach(() => {
		(db as any).transaction = async (fn: any) => fn(makeTx());

		mockUserRepo = {
			findById: async () => null,
		};

		mockVolunteerRepo = {
			findByUserId: async () => null,
		};

		service = new BecomeVolunteerService(
			mockVolunteerRepo as any,
			mockUserRepo as any,
		);
	});

	afterEach(() => {
		(db as any).transaction = originalTransaction;
		mockUserRepo = null;
		mockVolunteerRepo = null;
	});

	describe("becomeVolunteer", () => {
		test("should create volunteer record and return it when user exists and is not a volunteer", async () => {
			const mockUser = { id: "user-1", email: "test@test.com", role: "user" };

			mockUserRepo.findById = async () => mockUser;
			mockVolunteerRepo.findByUserId = async () => null;

			const result = await service.becomeVolunteer("user-1");

			expect(result).toMatchObject({ id: 1, userId: "user-1" });
		});

		test("should throw NotFoundError when user does not exist", async () => {
			mockUserRepo.findById = async () => null;

			expect(
				service.becomeVolunteer("nonexistent-user"),
			).rejects.toBeInstanceOf(NotFoundError);
		});

		test("should throw Error when user is already a volunteer", async () => {
			const mockUser = {
				id: "user-1",
				email: "test@test.com",
				role: "volunteer",
			};
			const existingVolunteer = { id: 1, userId: "user-1" };

			mockUserRepo.findById = async () => mockUser;
			mockVolunteerRepo.findByUserId = async () => existingVolunteer;

			expect(service.becomeVolunteer("user-1")).rejects.toThrow(
				"User is already a volunteer",
			);
		});

		test("should return volunteer with correct userId", async () => {
			const mockUser = { id: "user-1", email: "test@test.com", role: "user" };

			mockUserRepo.findById = async () => mockUser;
			mockVolunteerRepo.findByUserId = async () => null;

			const result = await service.becomeVolunteer("user-1");

			expect(result).toMatchObject({ userId: "user-1" });
		});

		test("should propagate repo errors from userRepo", async () => {
			mockUserRepo.findById = async () => {
				throw new Error("Database error");
			};

			expect(service.becomeVolunteer("user-1")).rejects.toThrow(
				"Database error",
			);
		});

		test("should propagate errors from transaction", async () => {
			const mockUser = { id: "user-1", email: "test@test.com", role: "user" };

			mockUserRepo.findById = async () => mockUser;
			mockVolunteerRepo.findByUserId = async () => null;

			(db as any).transaction = async () => {
				throw new Error("Database error");
			};

			expect(service.becomeVolunteer("user-1")).rejects.toThrow(
				"Database error",
			);
		});
	});
});
