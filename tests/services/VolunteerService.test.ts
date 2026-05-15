import { beforeEach, afterEach, describe, expect, test } from "bun:test";
import { NotFoundError } from "../../src/utils/Errors";
import { VolunteerService } from "../../src/services/VolunteerService";

describe("VolunteerService", () => {
	let service: VolunteerService;
	let mockVolunteerRepo: any;
	let mockVolunteerProfileRepo: any;

	beforeEach(() => {
		mockVolunteerRepo = {
			findByUserId: async () => null,
			create: async () => null,
			update: async () => null,
		};

		mockVolunteerProfileRepo = {
			findByVolunteerId: async () => null,
			create: async () => null,
			update: async () => null,
		};

		service = new VolunteerService(
			mockVolunteerRepo as any,
			mockVolunteerProfileRepo as any,
		);
	});

	afterEach(() => {
		mockVolunteerRepo = null;
		mockVolunteerProfileRepo = null;
	});

	describe("getOrCreateVolunteer", () => {
		test("should return existing volunteer when found", async () => {
			const existing = { id: 1, userId: "user-1", availability: false };
			mockVolunteerRepo.findByUserId = async () => existing;

			const result = await service.getVolunteer("user-1");
			expect(result).toMatchObject(existing);
		});

		test("should create volunteer when not found", async () => {
			const created = { id: 1, userId: "user-1", availability: false };
			mockVolunteerRepo.findByUserId = async () => null;
			mockVolunteerRepo.create = async () => created;

			const result = await service.getVolunteer("user-1");
			expect(result).toMatchObject(created);
		});

		test("should propagate repo errors", async () => {
			mockVolunteerRepo.findByUserId = async () => {
				throw new Error("Database error");
			};

			expect(service.getVolunteer("user-1")).rejects.toThrow("Database error");
		});
	});

	describe("getVolunteerProfile", () => {
		test("should return volunteer and profile when found", async () => {
			const volunteer = { id: 1, userId: "user-1" };
			const profile = { id: 1, volunteerId: 1, skills: ["cooking"] };
			mockVolunteerRepo.findByUserId = async () => volunteer;
			mockVolunteerProfileRepo.findByVolunteerId = async () => profile;

			const result = await service.getVolunteerProfile("user-1");
			expect(result).toMatchObject({ volunteer, profile });
		});

		test("should return null profile when volunteer has no profile", async () => {
			const volunteer = { id: 1, userId: "user-1" };
			mockVolunteerRepo.findByUserId = async () => volunteer;
			mockVolunteerProfileRepo.findByVolunteerId = async () => null;

			const result = await service.getVolunteerProfile("user-1");
			expect(result.profile).toBeNull();
		});

		test("should throw NotFoundError when volunteer not found", async () => {
			mockVolunteerRepo.findByUserId = async () => null;

			expect(service.getVolunteerProfile("nonexistent")).rejects.toBeInstanceOf(
				NotFoundError,
			);
		});

		test("should propagate repo errors", async () => {
			mockVolunteerRepo.findByUserId = async () => {
				throw new Error("Database error");
			};

			expect(service.getVolunteerProfile("user-1")).rejects.toThrow(
				"Database error",
			);
		});
	});

	describe("createVolunteerProfile", () => {
		test("should create profile with valid data", async () => {
			const volunteer = { id: 1, userId: "user-1" };
			const created = {
				id: 1,
				volunteerId: 1,
				skills: ["cooking"],
				maxDistanceKm: 10,
			};
			mockVolunteerRepo.findByUserId = async () => volunteer;
			mockVolunteerRepo.create = async () => volunteer;
			mockVolunteerProfileRepo.findByVolunteerId = async () => null;
			mockVolunteerProfileRepo.create = async () => created;

			const result = await service.createVolunteerProfile("user-1", {
				skills: ["cooking"],
				maxDistanceKm: 10,
			});
			expect(result).toMatchObject(created);
		});

		test("should create profile with empty skills", async () => {
			const volunteer = { id: 1, userId: "user-1" };
			mockVolunteerRepo.findByUserId = async () => volunteer;
			mockVolunteerRepo.create = async () => volunteer;
			mockVolunteerProfileRepo.findByVolunteerId = async () => null;
			mockVolunteerProfileRepo.create = async (data: any) => ({
				id: 1,
				volunteerId: 1,
				...data,
			});

			const result = await service.createVolunteerProfile("user-1", {});
			expect(result.skills).toEqual([]);
		});

		test("should throw error when profile already exists", async () => {
			const volunteer = { id: 1, userId: "user-1" };
			mockVolunteerRepo.findByUserId = async () => volunteer;
			mockVolunteerRepo.create = async () => volunteer;
			mockVolunteerProfileRepo.findByVolunteerId = async () => ({
				id: 1,
				volunteerId: 1,
			});

			expect(service.createVolunteerProfile("user-1", {})).rejects.toThrow(
				"Volunteer profile already exists",
			);
		});

		test("should propagate repo errors", async () => {
			const volunteer = { id: 1, userId: "user-1" };
			mockVolunteerRepo.findByUserId = async () => volunteer;
			mockVolunteerRepo.create = async () => volunteer;
			mockVolunteerProfileRepo.findByVolunteerId = async () => null;
			mockVolunteerProfileRepo.create = async () => {
				throw new Error("Database error");
			};

			expect(service.createVolunteerProfile("user-1", {})).rejects.toThrow(
				"Database error",
			);
		});
	});

	describe("updateVolunteerProfile", () => {
		test("should update profile with valid data", async () => {
			const volunteer = { id: 1, userId: "user-1" };
			const profile = { id: 1, volunteerId: 1, skills: ["cooking"] };
			const updated = {
				id: 1,
				volunteerId: 1,
				skills: ["cooking", "driving"],
				maxDistanceKm: 20,
			};
			mockVolunteerRepo.findByUserId = async () => volunteer;
			mockVolunteerRepo.update = async () => volunteer;
			mockVolunteerProfileRepo.findByVolunteerId = async () => profile;
			mockVolunteerProfileRepo.update = async () => updated;

			const result = await service.updateVolunteerProfile("user-1", {
				skills: ["cooking", "driving"],
				maxDistanceKm: 20,
			});
			expect(result).toMatchObject(updated);
		});

		test("should update availability on volunteer", async () => {
			const volunteer = { id: 1, userId: "user-1", availability: false };
			const profile = { id: 1, volunteerId: 1, skills: [] };
			let updatedVolunteer: any = null;

			mockVolunteerRepo.findByUserId = async () => volunteer;
			mockVolunteerRepo.update = async (_id: number, data: any) => {
				updatedVolunteer = data;
				return { ...volunteer, ...data };
			};
			mockVolunteerProfileRepo.findByVolunteerId = async () => profile;
			mockVolunteerProfileRepo.update = async () => profile;

			await service.updateVolunteerProfile("user-1", { availability: true });
			expect(updatedVolunteer).toMatchObject({ availability: true });
		});

		test("should throw NotFoundError when volunteer not found", async () => {
			mockVolunteerRepo.findByUserId = async () => null;

			expect(
				service.updateVolunteerProfile("nonexistent", {}),
			).rejects.toBeInstanceOf(NotFoundError);
		});

		test("should throw NotFoundError when profile not found", async () => {
			const volunteer = { id: 1, userId: "user-1" };
			mockVolunteerRepo.findByUserId = async () => volunteer;
			mockVolunteerRepo.update = async () => volunteer;
			mockVolunteerProfileRepo.findByVolunteerId = async () => null;

			expect(
				service.updateVolunteerProfile("user-1", {}),
			).rejects.toBeInstanceOf(NotFoundError);
		});
	});

	describe("addSkill", () => {
		test("should add skill successfully", async () => {
			const volunteer = { id: 1, userId: "user-1" };
			const profile = { id: 1, volunteerId: 1, skills: ["cooking"] };
			const updated = { id: 1, volunteerId: 1, skills: ["cooking", "driving"] };
			mockVolunteerRepo.findByUserId = async () => volunteer;
			mockVolunteerProfileRepo.findByVolunteerId = async () => profile;
			mockVolunteerProfileRepo.update = async () => updated;

			const result = await service.addSkill("user-1", "driving");
			expect(result).toMatchObject(updated);
		});

		test("should throw error when skill already exists", async () => {
			const volunteer = { id: 1, userId: "user-1" };
			const profile = { id: 1, volunteerId: 1, skills: ["cooking"] };
			mockVolunteerRepo.findByUserId = async () => volunteer;
			mockVolunteerProfileRepo.findByVolunteerId = async () => profile;

			expect(service.addSkill("user-1", "cooking")).rejects.toThrow(
				"Skill already exists",
			);
		});

		test("should throw NotFoundError when volunteer not found", async () => {
			mockVolunteerRepo.findByUserId = async () => null;

			expect(service.addSkill("nonexistent", "cooking")).rejects.toBeInstanceOf(
				NotFoundError,
			);
		});

		test("should throw NotFoundError when profile not found", async () => {
			const volunteer = { id: 1, userId: "user-1" };
			mockVolunteerRepo.findByUserId = async () => volunteer;
			mockVolunteerProfileRepo.findByVolunteerId = async () => null;

			expect(service.addSkill("user-1", "cooking")).rejects.toBeInstanceOf(
				NotFoundError,
			);
		});

		test("should propagate repo errors", async () => {
			const volunteer = { id: 1, userId: "user-1" };
			const profile = { id: 1, volunteerId: 1, skills: [] };
			mockVolunteerRepo.findByUserId = async () => volunteer;
			mockVolunteerProfileRepo.findByVolunteerId = async () => profile;
			mockVolunteerProfileRepo.update = async () => {
				throw new Error("Database error");
			};

			expect(service.addSkill("user-1", "cooking")).rejects.toThrow(
				"Database error",
			);
		});
	});

	describe("removeSkill", () => {
		test("should remove skill successfully", async () => {
			const volunteer = { id: 1, userId: "user-1" };
			const profile = { id: 1, volunteerId: 1, skills: ["cooking", "driving"] };
			const updated = { id: 1, volunteerId: 1, skills: ["cooking"] };
			mockVolunteerRepo.findByUserId = async () => volunteer;
			mockVolunteerProfileRepo.findByVolunteerId = async () => profile;
			mockVolunteerProfileRepo.update = async () => updated;

			const result = await service.removeSkill("user-1", "driving");
			expect(result).toMatchObject(updated);
		});

		test("should throw error when skill not found", async () => {
			const volunteer = { id: 1, userId: "user-1" };
			const profile = { id: 1, volunteerId: 1, skills: ["cooking"] };
			mockVolunteerRepo.findByUserId = async () => volunteer;
			mockVolunteerProfileRepo.findByVolunteerId = async () => profile;

			expect(service.removeSkill("user-1", "driving")).rejects.toThrow(
				"Skill not found",
			);
		});

		test("should throw NotFoundError when volunteer not found", async () => {
			mockVolunteerRepo.findByUserId = async () => null;

			expect(
				service.removeSkill("nonexistent", "cooking"),
			).rejects.toBeInstanceOf(NotFoundError);
		});

		test("should throw NotFoundError when profile not found", async () => {
			const volunteer = { id: 1, userId: "user-1" };
			mockVolunteerRepo.findByUserId = async () => volunteer;
			mockVolunteerProfileRepo.findByVolunteerId = async () => null;

			expect(service.removeSkill("user-1", "cooking")).rejects.toBeInstanceOf(
				NotFoundError,
			);
		});

		test("should call repo.update with correct skills after removal", async () => {
			const volunteer = { id: 1, userId: "user-1" };
			const profile = {
				id: 1,
				volunteerId: 1,
				skills: ["cooking", "driving", "teaching"],
			};
			let receivedData: any = null;

			mockVolunteerRepo.findByUserId = async () => volunteer;
			mockVolunteerProfileRepo.findByVolunteerId = async () => profile;
			mockVolunteerProfileRepo.update = async (_id: number, data: any) => {
				receivedData = data;
				return { ...profile, ...data };
			};

			await service.removeSkill("user-1", "driving");
			expect(receivedData.skills).toEqual(["cooking", "teaching"]);
		});

		test("should propagate repo errors", async () => {
			const volunteer = { id: 1, userId: "user-1" };
			const profile = { id: 1, volunteerId: 1, skills: ["cooking"] };
			mockVolunteerRepo.findByUserId = async () => volunteer;
			mockVolunteerProfileRepo.findByVolunteerId = async () => profile;
			mockVolunteerProfileRepo.update = async () => {
				throw new Error("Database error");
			};

			expect(service.removeSkill("user-1", "cooking")).rejects.toThrow(
				"Database error",
			);
		});
	});
});
