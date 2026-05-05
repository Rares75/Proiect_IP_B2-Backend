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
import { notifications } from "../../src/db/social";
import { volunteers } from "../../src/db/profile";
import { OfferController } from "../../src/controllers/OfferController";
import { OfferService } from "../../src/services/OfferService";
import { OfferRepository } from "../../src/db/repositories/offer.repository";
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
			isDatabaseAvailable = Boolean(result.rows[0]?.user_table);
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

	it("accepts a pending offer and creates assignment + notification", async () => {
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
});
