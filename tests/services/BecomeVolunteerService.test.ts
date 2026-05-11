import { beforeEach, afterEach, describe, expect, test } from "bun:test";
import { db } from "../../src/db";
import { NotFoundError } from "../../src/utils/Errors";
import { BecomeVolunteerService } from "../../src/services/BecomeVolunteerService";

describe("BecomeVolunteerService", () => {
	let service: BecomeVolunteerService;
	let mockVolunteerRepo: any;
	let mockUserRepo: any;
	const originalUpdate = (db as any).update;

	beforeEach(() => {
		(db as any).update = () => ({
			set: () => ({
				where: async () => [],
			}),
		});

		mockUserRepo = {
			findById: async () => null,
		};

		mockVolunteerRepo = {
			findByUserId: async () => null,
			create: async () => null,
		};

		service = new BecomeVolunteerService(
			mockVolunteerRepo as any,
			mockUserRepo as any,
		);
	});

	afterEach(() => {
		(db as any).update = originalUpdate;
		mockUserRepo = null;
		mockVolunteerRepo = null;
	});

	describe("becomeVolunteer", () => {
		test("should create volunteer record and return it when user exists and is not a volunteer", async () => {
			const mockUser = { id: "user-1", email: "test@test.com", role: "user" };
			const mockVolunteer = { id: 1, userId: "user-1", availability: false };

			mockUserRepo.findById = async () => mockUser;
			mockVolunteerRepo.findByUserId = async () => null;
			mockVolunteerRepo.create = async () => mockVolunteer;

			const result = await service.becomeVolunteer("user-1");

			expect(result).toMatchObject(mockVolunteer);
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

		test("should call volunteerRepo.create with correct userId", async () => {
			const mockUser = { id: "user-1", email: "test@test.com", role: "user" };
			let receivedData: any = null;

			mockUserRepo.findById = async () => mockUser;
			mockVolunteerRepo.findByUserId = async () => null;
			mockVolunteerRepo.create = async (data: any) => {
				receivedData = data;
				return { id: 1, ...data };
			};

			await service.becomeVolunteer("user-1");

			expect(receivedData).toMatchObject({ userId: "user-1" });
		});

		test("should propagate repo errors from userRepo", async () => {
			mockUserRepo.findById = async () => {
				throw new Error("Database error");
			};

			expect(service.becomeVolunteer("user-1")).rejects.toThrow(
				"Database error",
			);
		});

		test("should propagate repo errors from volunteerRepo.create", async () => {
			const mockUser = { id: "user-1", email: "test@test.com", role: "user" };

			mockUserRepo.findById = async () => mockUser;
			mockVolunteerRepo.findByUserId = async () => null;
			mockVolunteerRepo.create = async () => {
				throw new Error("Database error");
			};

			expect(service.becomeVolunteer("user-1")).rejects.toThrow(
				"Database error",
			);
		});
	});
});
