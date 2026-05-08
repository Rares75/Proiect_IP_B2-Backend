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
import { join } from "node:path";
import app from "../../../src/app";
import auth from "../../../src/auth";
import { db } from "../../../src/db";
import { helpOffers, helpRequests } from "../../../src/db/requests";
import { volunteers } from "../../../src/db/profile";
import { loadControllers } from "../../../src/utils/controller";

describe("POST /api/tasks/:id/offers integration", () => {
	let authSpy: ReturnType<typeof spyOn> | undefined;
	let isDatabaseAvailable = true;
	const requesterUserId = "offer-requester-user";
	const volunteerUserId = "offer-volunteer-user";
	let createdTaskId: number | undefined;
	let createdVolunteerId: number | undefined;

	beforeAll(async () => {
		const controllersPath = join(
			(import.meta as any).dir,
			"../../../src/controllers",
		);
		await loadControllers(controllersPath);

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
			user: { id: volunteerUserId, email: "volunteer@test.com" } as any,
			session: { id: "session-offer", userId: volunteerUserId } as any,
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
				.delete(helpOffers)
				.where(eq(helpOffers.helpRequestId, createdTaskId));
			await db.delete(helpRequests).where(eq(helpRequests.id, createdTaskId));
		}

		if (createdVolunteerId) {
			await db.delete(volunteers).where(eq(volunteers.id, createdVolunteerId));
		}

		await db.execute(
			sql`delete from "user" where "id" in (${requesterUserId}, ${volunteerUserId})`,
		);

		createdTaskId = undefined;
		createdVolunteerId = undefined;
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

	it("seeds an OPEN task and a volunteer, then creates a help offer persisted in DB", async () => {
		if (!isDatabaseAvailable) {
			return;
		}

		await insertUser(
			requesterUserId,
			"offer-requester@example.com",
			"Offer Requester",
		);
		await insertUser(
			volunteerUserId,
			"offer-volunteer@example.com",
			"Offer Volunteer",
		);

		const [volunteer] = await db
			.insert(volunteers)
			.values({
				userId: volunteerUserId,
				availability: true,
			})
			.returning({ id: volunteers.id });
		createdVolunteerId = volunteer.id;

		const [task] = await db
			.insert(helpRequests)
			.values({
				requestedByUserId: requesterUserId,
				title: "Task for offer integration",
				description: "Need help with transport",
				status: "OPEN",
				category: "FACE_TO_FACE",
			})
			.returning({ id: helpRequests.id });
		createdTaskId = task.id;

		const response = await app.request(`/api/tasks/${task.id}/offers`, {
			method: "POST",
			headers: {
				Authorization: "Bearer fake-test-token",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ message: "Pot ajuta maine dimineata" }),
		});
		const body: any = await response.json();

		expect(response.status).toBe(201);
		expect(body.data.status).toBe("PENDING");
		expect(body.data.helpRequestId).toBe(task.id);
		expect(body.data.volunteerId).toBe(volunteer.id);

		const [savedOffer] = await db
			.select()
			.from(helpOffers)
			.where(eq(helpOffers.id, body.data.id));

		expect(savedOffer).toBeDefined();
		expect(savedOffer.helpRequestId).toBe(task.id);
		expect(savedOffer.volunteerId).toBe(volunteer.id);
		expect(savedOffer.message).toBe("Pot ajuta maine dimineata");
		expect(savedOffer.status).toBe("PENDING");
	});
});
