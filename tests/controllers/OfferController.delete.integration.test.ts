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
import { eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import auth from "../../src/auth";
import { db } from "../../src/db";
import { helpOffers, helpRequests } from "../../src/db/requests";
import { volunteers } from "../../src/db/profile";
import { OfferController } from "../../src/controllers/OfferController";
import { OfferService } from "../../src/services/OfferService";
import { OfferRepository } from "../../src/db/repositories/offer.repository";
import { HelpRequestRepository } from "../../src/db/repositories/helpRequest.repository";
import { VolunteerRepository } from "../../src/db/repositories/volunteer.repository";
import { NotificationService } from "../../src/services/NotificationService";
import { NotificationRepository } from "../../src/db/repositories/notification.repository";

describe("DELETE /api/offers/:id integration", () => {
	let app: Hono;
	let authSpy: ReturnType<typeof spyOn> | undefined;
	let isDatabaseAvailable = true;

	const taskOwnerId = "delete-task-owner";
	const volunteerCreatorId = "delete-volunteer-creator";
	const otherUserId = "delete-other-user";

	let createdTaskId: number;
	let createdVolunteerId: number;
	let createdOfferId: number;

	beforeAll(async () => {
		const offerController = new OfferController(
			new OfferService(
				new OfferRepository(),
				new HelpRequestRepository(),
				new VolunteerRepository(),
				new NotificationService(new NotificationRepository()),
			),
		);
		app = new Hono().basePath("/api");
		app.route("/", offerController.controller);

		try {
			const result = await db.execute(
				sql`select to_regclass('public.user') as user_table`,
			);
			isDatabaseAvailable = Boolean(result.rows[0]?.user_table);
		} catch {
			isDatabaseAvailable = false;
		}
	});

	const mockAuth = (userId: string) => {
		authSpy?.mockRestore();
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: userId, email: "test@test.com" } as any,
			session: { id: "session-id", userId: userId } as any,
		});
	};

	beforeEach(async () => {
		if (!isDatabaseAvailable) return;

		// Creăm userii necesari
		await db.execute(
			sql`insert into "user" ("id", "name", "email", "email_verified", "updated_at") values (${taskOwnerId}, 'Owner', 'owner@t.com', true, now()) on conflict do nothing`,
		);
		await db.execute(
			sql`insert into "user" ("id", "name", "email", "email_verified", "updated_at") values (${volunteerCreatorId}, 'Vol', 'vol@t.com', true, now()) on conflict do nothing`,
		);
		await db.execute(
			sql`insert into "user" ("id", "name", "email", "email_verified", "updated_at") values (${otherUserId}, 'Other', 'other@t.com', true, now()) on conflict do nothing`,
		);

		// Creăm voluntarul
		const [vol] = await db
			.insert(volunteers)
			.values({ userId: volunteerCreatorId, availability: true })
			.returning({ id: volunteers.id });
		createdVolunteerId = vol.id;

		// Creăm task-ul
		const [task] = await db
			.insert(helpRequests)
			.values({
				requestedByUserId: taskOwnerId,
				title: "Test Task",
				description: "Test",
				status: "OPEN",
				category: "FACE_TO_FACE",
			})
			.returning({ id: helpRequests.id });
		createdTaskId = task.id;

		// Creăm oferta PENDING
		const [offer] = await db
			.insert(helpOffers)
			.values({
				helpRequestId: task.id,
				volunteerId: vol.id,
				message: "Help!",
				status: "PENDING",
			})
			.returning({ id: helpOffers.id });
		createdOfferId = offer.id;
	});

	afterEach(async () => {
		if (!isDatabaseAvailable) return;

		// Curățăm baza de date după fiecare test
		await db
			.delete(helpOffers)
			.where(eq(helpOffers.helpRequestId, createdTaskId));
		await db.delete(helpRequests).where(eq(helpRequests.id, createdTaskId));
		await db.delete(volunteers).where(eq(volunteers.id, createdVolunteerId));
		await db.execute(
			sql`delete from "user" where "id" in (${taskOwnerId}, ${volunteerCreatorId}, ${otherUserId})`,
		);

		authSpy?.mockRestore();
	});

	it("should delete a PENDING offer if requested by its creator (204)", async () => {
		if (!isDatabaseAvailable) return;
		mockAuth(volunteerCreatorId); // Ne logăm ca voluntarul care a creat oferta

		const response = await app.request(`/api/offers/${createdOfferId}`, {
			method: "DELETE",
		});

		expect(response.status).toBe(204);

		// Verificăm că a dispărut din DB
		const deletedOffer = await db
			.select()
			.from(helpOffers)
			.where(eq(helpOffers.id, createdOfferId));
		expect(deletedOffer.length).toBe(0);
	});

	it("should return 403 if another user tries to delete the offer", async () => {
		if (!isDatabaseAvailable) return;
		mockAuth(otherUserId); // Ne logăm cu un user oarecare

		const response = await app.request(`/api/offers/${createdOfferId}`, {
			method: "DELETE",
		});

		expect(response.status).toBe(403);
	});

	it("should return 409 if offer is not PENDING", async () => {
		if (!isDatabaseAvailable) return;
		mockAuth(volunteerCreatorId);

		// Modificăm manual oferta în ACCEPTED pentru test
		await db
			.update(helpOffers)
			.set({ status: "ACCEPTED" })
			.where(eq(helpOffers.id, createdOfferId));

		const response = await app.request(`/api/offers/${createdOfferId}`, {
			method: "DELETE",
		});

		expect(response.status).toBe(409);
	});
});
