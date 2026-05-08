/// <reference types="bun-types" />
import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	spyOn,
} from "bun:test";
import { eq, inArray, sql } from "drizzle-orm";
import { Hono } from "hono";
import auth from "../../src/auth";
import { db } from "../../src/db";
import { NotificationRepository } from "../../src/db/repositories/notification.repository";
import {
	helpOffers,
	helpRequests,
	taskAssignments,
} from "../../src/db/requests";
import { conversations, notifications } from "../../src/db/social";
import { volunteers } from "../../src/db/profile";
import { OfferController } from "../../src/controllers/OfferController";
import { OfferService } from "../../src/services/OfferService";
import { OfferRepository } from "../../src/db/repositories/offer.repository";
import { ConversationRepository } from "../../src/db/repositories/conversation.repository";
import { HelpRequestRepository } from "../../src/db/repositories/helpRequest.repository";
import { VolunteerRepository } from "../../src/db/repositories/volunteer.repository";
import { NotificationService } from "../../src/services/NotificationService";

describe("PATCH /api/offers/:id/status integration", () => {
	let app: Hono;
	let authSpy: ReturnType<typeof spyOn> | undefined;
	let isDatabaseAvailable = true;
	const ownerUserId = "offer-owner-user";
	const volunteerOneUserId = "offer-volunteer-one";
	const volunteerTwoUserId = "offer-volunteer-two";
	let createdTaskId: number | undefined;
	let createdVolunteerIds: number[] = [];
	let createdOfferIds: number[] = [];

	beforeAll(async () => {
		const offerController = new OfferController(
			new OfferService(
				new OfferRepository(),
				new HelpRequestRepository(),
				new VolunteerRepository(),
				new NotificationService(new NotificationRepository()),
			),
			new VolunteerRepository(),
		);
		app = new Hono().basePath("/api");
		app.route("/offers", offerController.controller);

		try {
			const result = await db.execute(
				sql`select to_regclass('public.user') as user_table`,
			);
			isDatabaseAvailable = Boolean((result as any)[0]?.user_table);
		} catch {
			isDatabaseAvailable = false;
		}
	});

	beforeEach(() => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: ownerUserId, email: "owner@test.com" } as any,
			session: { id: "session-owner", userId: ownerUserId } as any,
		});
	});

	afterEach(async () => {
		if (!isDatabaseAvailable) {
			authSpy?.mockRestore();
			authSpy = undefined;
			return;
		}

		if (createdTaskId) {
			await db
				.delete(taskAssignments)
				.where(eq(taskAssignments.helpRequestId, createdTaskId));
			await db
				.delete(helpOffers)
				.where(eq(helpOffers.helpRequestId, createdTaskId));
			await db.delete(helpRequests).where(eq(helpRequests.id, createdTaskId));
			await db
				.delete(notifications)
				.where(eq(notifications.relatedRequestId, createdTaskId));
		}

		if (createdVolunteerIds.length > 0) {
			await db
				.delete(volunteers)
				.where(inArray(volunteers.id, createdVolunteerIds));
		}

		await db.execute(
			sql`delete from "user" where "id" in (${ownerUserId}, ${volunteerOneUserId}, ${volunteerTwoUserId})`,
		);

		createdTaskId = undefined;
		createdVolunteerIds = [];
		createdOfferIds = [];
		authSpy?.mockRestore();
		authSpy = undefined;
	});

	const insertUser = async (id: string, email: string, name: string) => {
		await db.execute(sql`
			insert into "user" ("id", "name", "email", "email_verified", "updated_at")
			values (${id}, ${name}, ${email}, true, now())
			on conflict ("id") do nothing
		`);
	};

	const seedOwnerAndVolunteers = async () => {
		await insertUser(ownerUserId, "owner@test.com", "Offer Owner");
		await insertUser(volunteerOneUserId, "vol1@test.com", "Volunteer One");
		await insertUser(volunteerTwoUserId, "vol2@test.com", "Volunteer Two");

		const [volunteerOne] = await db
			.insert(volunteers)
			.values({
				userId: volunteerOneUserId,
				availability: true,
			})
			.returning({ id: volunteers.id });
		const [volunteerTwo] = await db
			.insert(volunteers)
			.values({
				userId: volunteerTwoUserId,
				availability: true,
			})
			.returning({ id: volunteers.id });

		createdVolunteerIds = [volunteerOne.id, volunteerTwo.id];

		const [task] = await db
			.insert(helpRequests)
			.values({
				requestedByUserId: ownerUserId,
				title: "Integration task",
				description: "Need help with transport",
				status: "OPEN",
				category: "FACE_TO_FACE",
			})
			.returning({ id: helpRequests.id, status: helpRequests.status });

		createdTaskId = task.id;

		const offers = await db
			.insert(helpOffers)
			.values([
				{
					helpRequestId: task.id,
					volunteerId: volunteerOne.id,
					message: "I can help",
					status: "PENDING",
				},
				{
					helpRequestId: task.id,
					volunteerId: volunteerTwo.id,
					message: "I can also help",
					status: "PENDING",
				},
			])
			.returning({ id: helpOffers.id });

		createdOfferIds = offers.map((offer) => offer.id);

		return {
			task,
			volunteerOne,
			volunteerTwo,
		};
	};

	it("accepts a pending offer and creates assignment, conversation, and notification", async () => {
		if (!isDatabaseAvailable) {
			return;
		}

		const { task, volunteerOne } = await seedOwnerAndVolunteers();

		const response = await app.request(
			`/api/offers/${createdOfferIds[0]}/status`,
			{
				method: "PATCH",
				headers: {
					Authorization: "Bearer fake-test-token",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ status: "ACCEPTED" }),
			},
		);
		const body: any = await response.json();

		expect(response.status).toBe(200);
		expect(body.data.status).toBe("ACCEPTED");

		const [updatedTask] = await db
			.select()
			.from(helpRequests)
			.where(eq(helpRequests.id, task.id));
		expect(updatedTask.status).toBe("MATCHED");

		const [assignment] = await db
			.select()
			.from(taskAssignments)
			.where(eq(taskAssignments.helpRequestId, task.id));
		expect(assignment).toBeDefined();
		expect(assignment.offerId).toBe(createdOfferIds[0]);
		expect(assignment.handledByVolunteerId).toBe(volunteerOne.id);
		expect(assignment.status).toBe("ASSIGNED");

		const savedConversations = await db
			.select()
			.from(conversations)
			.where(eq(conversations.taskAssignmentId, assignment.id));
		expect(savedConversations).toHaveLength(1);
		expect(savedConversations[0].status).toBe("OPEN");
		expect(savedConversations[0].taskAssignmentId).toBe(assignment.id);

		const rejectedOffer = await db
			.select()
			.from(helpOffers)
			.where(eq(helpOffers.id, createdOfferIds[1]));
		expect(rejectedOffer[0].status).toBe("REJECTED");

		const [notification] = await db
			.select()
			.from(notifications)
			.where(eq(notifications.relatedRequestId, task.id));
		expect(notification.type).toBe("OFFER_ACCEPTED");
	});

	it("rejects a pending offer and keeps the task OPEN", async () => {
		if (!isDatabaseAvailable) {
			return;
		}

		const { task } = await seedOwnerAndVolunteers();

		const response = await app.request(
			`/api/offers/${createdOfferIds[0]}/status`,
			{
				method: "PATCH",
				headers: {
					Authorization: "Bearer fake-test-token",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ status: "REJECTED" }),
			},
		);
		const body: any = await response.json();

		expect(response.status).toBe(200);
		expect(body.data.status).toBe("REJECTED");

		const [updatedTask] = await db
			.select()
			.from(helpRequests)
			.where(eq(helpRequests.id, task.id));
		expect(updatedTask.status).toBe("OPEN");
	});

	it("returns 409 for PENDING status body", async () => {
		if (!isDatabaseAvailable) {
			return;
		}

		await seedOwnerAndVolunteers();

		const response = await app.request(
			`/api/offers/${createdOfferIds[0]}/status`,
			{
				method: "PATCH",
				headers: {
					Authorization: "Bearer fake-test-token",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ status: "PENDING" }),
			},
		);

		expect(response.status).toBe(409);
	});

	it("returns a clear 409 message when rejecting an already rejected offer", async () => {
		if (!isDatabaseAvailable) {
			return;
		}

		await seedOwnerAndVolunteers();

		const firstResponse = await app.request(
			`/api/offers/${createdOfferIds[0]}/status`,
			{
				method: "PATCH",
				headers: {
					Authorization: "Bearer fake-test-token",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ status: "REJECTED" }),
			},
		);
		expect(firstResponse.status).toBe(200);

		const secondResponse = await app.request(
			`/api/offers/${createdOfferIds[0]}/status`,
			{
				method: "PATCH",
				headers: {
					Authorization: "Bearer fake-test-token",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ status: "REJECTED" }),
			},
		);
		const body: any = await secondResponse.json();

		expect(secondResponse.status).toBe(409);
		expect(body.message).toBe(
			"Offer is already REJECTED and cannot be updated again",
		);
	});

	it("handles two concurrent accept requests so only one wins", async () => {
		if (!isDatabaseAvailable) {
			return;
		}

		const { task } = await seedOwnerAndVolunteers();

		const [firstResponse, secondResponse] = await Promise.all([
			app.request(`/api/offers/${createdOfferIds[0]}/status`, {
				method: "PATCH",
				headers: {
					Authorization: "Bearer fake-test-token",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ status: "ACCEPTED" }),
			}),
			app.request(`/api/offers/${createdOfferIds[1]}/status`, {
				method: "PATCH",
				headers: {
					Authorization: "Bearer fake-test-token",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ status: "ACCEPTED" }),
			}),
		]);

		const statuses = [firstResponse.status, secondResponse.status].sort();
		expect(statuses).toEqual([200, 409]);

		const [updatedTask] = await db
			.select()
			.from(helpRequests)
			.where(eq(helpRequests.id, task.id));
		expect(updatedTask.status).toBe("MATCHED");
	});

	it("creates an OPEN conversation for a guest requester task when an offer is accepted", async () => {
		if (!isDatabaseAvailable) {
			return;
		}

		await insertUser(volunteerOneUserId, "vol1@test.com", "Volunteer One");

		const [volunteerOne] = await db
			.insert(volunteers)
			.values({
				userId: volunteerOneUserId,
				availability: true,
			})
			.returning({ id: volunteers.id, userId: volunteers.userId });
		createdVolunteerIds = [volunteerOne.id];

		const [task] = await db
			.insert(helpRequests)
			.values({
				requestedByUserId: null,
				guestSessionId: "guest-session-accept-offer",
				title: "Guest integration task",
				description: "Guest needs help with transport",
				status: "OPEN",
				category: "FACE_TO_FACE",
			})
			.returning({ id: helpRequests.id, status: helpRequests.status });
		createdTaskId = task.id;

		const [offer] = await db
			.insert(helpOffers)
			.values({
				helpRequestId: task.id,
				volunteerId: volunteerOne.id,
				message: "I can help a guest requester",
				status: "PENDING",
			})
			.returning({
				id: helpOffers.id,
				status: helpOffers.status,
				helpRequestId: helpOffers.helpRequestId,
				volunteerId: helpOffers.volunteerId,
			});
		createdOfferIds = [offer.id];

		const accepted = await db.transaction((tx) =>
			new OfferRepository().acceptOffer(
				{
					offerId: offer.id,
					helpRequestId: task.id,
					volunteerId: volunteerOne.id,
					status: offer.status,
					taskStatus: task.status,
					requestTitle: "Guest integration task",
					requestedByUserId: null,
					volunteerUserId: volunteerOne.userId,
				},
				tx,
			),
		);

		const savedConversations = await db
			.select()
			.from(conversations)
			.where(eq(conversations.taskAssignmentId, accepted.taskAssignment.id));
		expect(savedConversations).toHaveLength(1);
		expect(savedConversations[0].status).toBe("OPEN");
		expect(savedConversations[0].taskAssignmentId).toBe(
			accepted.taskAssignment.id,
		);
	});

	it("rolls back task assignment creation when conversation creation fails", async () => {
		if (!isDatabaseAvailable) {
			return;
		}

		const { task, volunteerOne } = await seedOwnerAndVolunteers();
		const failingConversationRepo = {
			create: async () => {
				throw new Error("conversation insert failed");
			},
		};

		await expect(
			db.transaction((tx) =>
				new OfferRepository(failingConversationRepo as any).acceptOffer(
					{
						offerId: createdOfferIds[0],
						helpRequestId: task.id,
						volunteerId: volunteerOne.id,
						status: "PENDING",
						taskStatus: "OPEN",
						requestTitle: "Integration task",
						requestedByUserId: ownerUserId,
						volunteerUserId: volunteerOneUserId,
					},
					tx,
				),
			),
		).rejects.toThrow("conversation insert failed");

		const assignments = await db
			.select()
			.from(taskAssignments)
			.where(eq(taskAssignments.helpRequestId, task.id));
		expect(assignments).toHaveLength(0);
	});

	it("returns the existing conversation when duplicate creation is attempted", async () => {
		if (!isDatabaseAvailable) {
			return;
		}

		const { task, volunteerOne } = await seedOwnerAndVolunteers();
		const [assignment] = await db
			.insert(taskAssignments)
			.values({
				helpRequestId: task.id,
				offerId: createdOfferIds[0],
				requestedByUserId: ownerUserId,
				handledByVolunteerId: volunteerOne.id,
			})
			.returning({ id: taskAssignments.id });

		const conversationRepo = new ConversationRepository();
		const first = await conversationRepo.create(assignment.id);
		const second = await conversationRepo.create(assignment.id);

		expect(second).toEqual(first);

		const savedConversations = await db
			.select()
			.from(conversations)
			.where(eq(conversations.taskAssignmentId, assignment.id));
		expect(savedConversations).toHaveLength(1);

		const byHelpRequest = await conversationRepo.findByHelpRequestId(task.id);
		expect(byHelpRequest?.id).toBe(first.id);
	});

	it("returns 400 when offer id is not a positive integer", async () => {
		const response = await app.request("/api/offers/not-a-number/status", {
			method: "PATCH",
			headers: {
				Authorization: "Bearer fake-test-token",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ status: "ACCEPTED" }),
		});
		const body: any = await response.json();

		expect(response.status).toBe(400);
		expect(body.isClientError).toBe(true);
		expect(body.message).toContain("positive integer");
	});

	it("returns 400 when request body is missing status", async () => {
		const response = await app.request("/api/offers/1/status", {
			method: "PATCH",
			headers: {
				Authorization: "Bearer fake-test-token",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({}),
		});
		const body: any = await response.json();

		expect(response.status).toBe(400);
		expect(body.isClientError).toBe(true);
		expect(body.message).toBe("Request body must contain a valid status");
	});

	it("returns 401 when neither auth session nor guest session is present", async () => {
		authSpy?.mockResolvedValue(null as any);

		const response = await app.request("/api/offers/1/status", {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ status: "ACCEPTED" }),
		});
		const body: any = await response.json();

		expect(response.status).toBe(401);
		expect(body.isUnauthorized).toBe(true);
	});

	it("returns 404 when the offer does not exist", async () => {
		if (!isDatabaseAvailable) {
			return;
		}

		const response = await app.request("/api/offers/999999/status", {
			method: "PATCH",
			headers: {
				Authorization: "Bearer fake-test-token",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ status: "ACCEPTED" }),
		});
		const body: any = await response.json();

		expect(response.status).toBe(404);
		expect(body.notFound).toBe(true);
	});

	it("returns 403 when an authenticated user is not the task owner", async () => {
		if (!isDatabaseAvailable) {
			return;
		}

		await seedOwnerAndVolunteers();
		authSpy?.mockResolvedValue({
			user: { id: "offer-intruder-user", email: "intruder@test.com" } as any,
			session: {
				id: "session-intruder",
				userId: "offer-intruder-user",
			} as any,
		});

		const response = await app.request(
			`/api/offers/${createdOfferIds[0]}/status`,
			{
				method: "PATCH",
				headers: {
					Authorization: "Bearer fake-test-token",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ status: "ACCEPTED" }),
			},
		);
		const body: any = await response.json();

		expect(response.status).toBe(403);
		expect(body.message).toContain("Only the task owner");
	});

	it("returns 409 when an already rejected offer is accepted", async () => {
		if (!isDatabaseAvailable) {
			return;
		}

		await seedOwnerAndVolunteers();
		await db
			.update(helpOffers)
			.set({ status: "REJECTED" })
			.where(eq(helpOffers.id, createdOfferIds[0]));

		const response = await app.request(
			`/api/offers/${createdOfferIds[0]}/status`,
			{
				method: "PATCH",
				headers: {
					Authorization: "Bearer fake-test-token",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ status: "ACCEPTED" }),
			},
		);
		const body: any = await response.json();

		expect(response.status).toBe(409);
		expect(body.message).toContain("REJECTED");
	});

	it("accepts a guest-owned task offer through the endpoint", async () => {
		if (!isDatabaseAvailable) {
			return;
		}

		const guestSessionId = "guest-session-endpoint-accept";
		authSpy?.mockResolvedValue(null as any);
		await insertUser(volunteerOneUserId, "vol1@test.com", "Volunteer One");

		const [volunteerOne] = await db
			.insert(volunteers)
			.values({
				userId: volunteerOneUserId,
				availability: true,
			})
			.returning({ id: volunteers.id });
		createdVolunteerIds = [volunteerOne.id];

		const [task] = await db
			.insert(helpRequests)
			.values({
				requestedByUserId: null,
				guestSessionId,
				title: "Guest endpoint task",
				description: "Guest owner accepts through HTTP",
				status: "OPEN",
				category: "FACE_TO_FACE",
			})
			.returning({ id: helpRequests.id });
		createdTaskId = task.id;

		const [offer] = await db
			.insert(helpOffers)
			.values({
				helpRequestId: task.id,
				volunteerId: volunteerOne.id,
				message: "I can help through endpoint",
				status: "PENDING",
			})
			.returning({ id: helpOffers.id });
		createdOfferIds = [offer.id];

		const response = await app.request(`/api/offers/${offer.id}/status`, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				"X-Guest-Session": guestSessionId,
			},
			body: JSON.stringify({ status: "ACCEPTED" }),
		});
		const body: any = await response.json();

		expect(response.status).toBe(200);
		expect(body.data.status).toBe("ACCEPTED");

		const [assignment] = await db
			.select()
			.from(taskAssignments)
			.where(eq(taskAssignments.helpRequestId, task.id));
		expect(assignment.requestedByUserId).toBeNull();

		const savedConversations = await db
			.select()
			.from(conversations)
			.where(eq(conversations.taskAssignmentId, assignment.id));
		expect(savedConversations).toHaveLength(1);
	});

	it("returns 403 when guest session does not own the task", async () => {
		if (!isDatabaseAvailable) {
			return;
		}

		authSpy?.mockResolvedValue(null as any);
		await insertUser(volunteerOneUserId, "vol1@test.com", "Volunteer One");

		const [volunteerOne] = await db
			.insert(volunteers)
			.values({
				userId: volunteerOneUserId,
				availability: true,
			})
			.returning({ id: volunteers.id });
		createdVolunteerIds = [volunteerOne.id];

		const [task] = await db
			.insert(helpRequests)
			.values({
				requestedByUserId: null,
				guestSessionId: "guest-session-owner",
				title: "Guest forbidden task",
				description: "Guest owner must match",
				status: "OPEN",
				category: "FACE_TO_FACE",
			})
			.returning({ id: helpRequests.id });
		createdTaskId = task.id;

		const [offer] = await db
			.insert(helpOffers)
			.values({
				helpRequestId: task.id,
				volunteerId: volunteerOne.id,
				message: "I can help the guest",
				status: "PENDING",
			})
			.returning({ id: helpOffers.id });
		createdOfferIds = [offer.id];

		const response = await app.request(`/api/offers/${offer.id}/status`, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				"X-Guest-Session": "guest-session-other",
			},
			body: JSON.stringify({ status: "ACCEPTED" }),
		});
		const body: any = await response.json();

		expect(response.status).toBe(403);
		expect(body.message).toContain("Only the task owner");

		const [unchangedOffer] = await db
			.select()
			.from(helpOffers)
			.where(eq(helpOffers.id, offer.id));
		expect(unchangedOffer.status).toBe("PENDING");
	});
});
