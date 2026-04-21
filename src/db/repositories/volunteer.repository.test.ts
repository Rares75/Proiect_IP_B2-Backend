import { expect, test, describe } from "bun:test";

import { volunteerRepository } from "./volunteer.repository";
import { userRepository } from "./user.repository";

describe("VolunteerRepository tests", () => {
	let testUserId: string;
	let testVolunteerId: number;

	test("should create a test user and volunteer", async () => {
		const newUser = await userRepository.create({
			id: crypto.randomUUID(),
			name: "test volunteer user",
			email: `volunteer_${Date.now()}@example.com`,
			phone: "0744000000",
		});

		expect(newUser).toBeDefined();
		testUserId = newUser.id;

		const newVolunteer = await volunteerRepository.create({
			userId: testUserId,
			availability: true,
			trustScore: 0,
			completedTasks: 0,
		});

		expect(newVolunteer).toBeDefined();
		expect(newVolunteer.userId).toBe(testUserId);
		expect(newVolunteer.availability).toBe(true);

		testVolunteerId = newVolunteer.id;
	});

	test("should find volunteer by id", async () => {
		const found = await volunteerRepository.findById(testVolunteerId);
		expect(found).toBeDefined();
		expect(found?.userId).toBe(testUserId);
	});

	test("should find volunteer by userId", async () => {
		const found = await volunteerRepository.findByUserId(testUserId);
		expect(found).toBeDefined();
		expect(found?.id).toBe(testVolunteerId);
	});

	// test("should return volunteer profile with aggregated data", async () => {
	// 	const profile = await volunteerRepository.findProfileById(testVolunteerId);
	// 	expect(profile).toBeDefined();
	// 	expect(profile?.volunteerId).toBe(testVolunteerId);
	// 	expect(profile?.name).toBe("test volunteer user");
	// 	expect(profile?.email).toContain("volunteer_");
	// });

	test("should return empty ratings for new volunteer", async () => {
		const { ratings, averageStars } =
			await volunteerRepository.findRatingsById(testVolunteerId);
		expect(ratings).toBeDefined();
		expect(ratings.length).toBe(0);
		expect(averageStars).toBeNull();
	});

	test("should update volunteer availability", async () => {
		const updated = await volunteerRepository.update(testVolunteerId, {
			availability: false,
		});
		expect(updated).toBeDefined();
		expect(updated?.availability).toBe(false);
	});

	test("should confirm volunteer exists", async () => {
		const exists = await volunteerRepository.exists(testVolunteerId);
		expect(exists).toBe(true);
	});

	test("should count volunteers successfully", async () => {
		const total = await volunteerRepository.count();
		expect(total).toBeGreaterThan(0);
	});

	test("should delete volunteer and user", async () => {
		const isDeleted = await volunteerRepository.delete(testVolunteerId);
		expect(isDeleted).toBe(true);

		const exists = await volunteerRepository.exists(testVolunteerId);
		expect(exists).toBe(false);

		// cleanup user
		await userRepository.delete(testUserId);
	});
});
