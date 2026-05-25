import { beforeEach, describe, expect, test } from "bun:test";
import { notifyEligibleVolunteersForNewRequest } from "../../src/services/notifications/newRequestNotification";

describe("notifyEligibleVolunteersForNewRequest", () => {
	let mockRepo: {
		findEligibleNewRequestRecipients: (
			skillsNeeded: string[],
			location: { x: number; y: number } | null,
		) => Promise<{ userId: string }[]>;
		createMany: (data: any[]) => Promise<any[]>;
		capturedSkills: string[];
		capturedLocation: { x: number; y: number } | null;
		capturedNotifications: any[];
	};

	beforeEach(() => {
		mockRepo = {
			capturedSkills: [],
			capturedLocation: null,
			capturedNotifications: [],
			findEligibleNewRequestRecipients: async (skillsNeeded, location) => {
				mockRepo.capturedSkills = skillsNeeded;
				mockRepo.capturedLocation = location;
				return [];
			},
			createMany: async (data) => {
				mockRepo.capturedNotifications = data;
				return data;
			},
		};
	});

	test("nu apeleaza createMany cand nu exista voluntari eligibili", async () => {
		let createManyCalled = false;
		mockRepo.createMany = async (data) => {
			createManyCalled = true;
			return data;
		};

		await notifyEligibleVolunteersForNewRequest(mockRepo as any, {
			id: 1,
			title: "Test",
			skillsNeeded: [],
			location: null,
		});

		expect(createManyCalled).toBe(false);
	});

	test("apeleaza createMany cu notificarile corecte cand exista recipienti", async () => {
		mockRepo.findEligibleNewRequestRecipients = async () => [
			{ userId: "user-1" },
			{ userId: "user-2" },
		];

		await notifyEligibleVolunteersForNewRequest(mockRepo as any, {
			id: 42,
			title: "Cumparaturi",
			skillsNeeded: [],
			location: null,
		});

		expect(mockRepo.capturedNotifications).toHaveLength(2);
		expect(mockRepo.capturedNotifications[0]).toMatchObject({
			userId: "user-1",
			type: "NEW_REQUEST",
			relatedRequestId: 42,
		});
		expect(mockRepo.capturedNotifications[1]).toMatchObject({
			userId: "user-2",
			type: "NEW_REQUEST",
			relatedRequestId: 42,
		});
	});

	test("passeaza skillsNeeded goale catre repo cand lista e vida", async () => {
		await notifyEligibleVolunteersForNewRequest(mockRepo as any, {
			id: 1,
			title: "Test",
			skillsNeeded: [],
			location: null,
		});

		expect(mockRepo.capturedSkills).toEqual([]);
	});

	test("passeaza skillsNeeded catre repo cand lista e ne-vida", async () => {
		await notifyEligibleVolunteersForNewRequest(mockRepo as any, {
			id: 1,
			title: "Test",
			skillsNeeded: ["transport", "prim-ajutor"],
			location: null,
		});

		expect(mockRepo.capturedSkills).toEqual(["transport", "prim-ajutor"]);
	});

	test("passeaza null pentru location cand request-ul nu are locatie", async () => {
		await notifyEligibleVolunteersForNewRequest(mockRepo as any, {
			id: 1,
			title: "Test",
			skillsNeeded: [],
			location: null,
		});

		expect(mockRepo.capturedLocation).toBeNull();
	});

	test("passeaza locatia catre repo cand request-ul are locatie", async () => {
		const location = { x: 27.601, y: 47.158 };

		await notifyEligibleVolunteersForNewRequest(mockRepo as any, {
			id: 1,
			title: "Test",
			skillsNeeded: [],
			location,
		});

		expect(mockRepo.capturedLocation).toEqual(location);
	});

	test("passeaza atat skills cat si locatia simultan", async () => {
		const location = { x: 27.601, y: 47.158 };

		await notifyEligibleVolunteersForNewRequest(mockRepo as any, {
			id: 5,
			title: "Ajutor medical",
			skillsNeeded: ["prim-ajutor"],
			location,
		});

		expect(mockRepo.capturedSkills).toEqual(["prim-ajutor"]);
		expect(mockRepo.capturedLocation).toEqual(location);
	});

	test("textul notificarii contine titlul request-ului", async () => {
		mockRepo.findEligibleNewRequestRecipients = async () => [
			{ userId: "user-1" },
		];

		await notifyEligibleVolunteersForNewRequest(mockRepo as any, {
			id: 1,
			title: "Cumparaturi urgente",
			skillsNeeded: [],
			location: null,
		});

		expect(mockRepo.capturedNotifications[0].text).toContain(
			"Cumparaturi urgente",
		);
	});
});
