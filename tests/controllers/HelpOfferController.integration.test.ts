/// <reference types="bun-types" />
import { afterAll, beforeAll, describe, expect, it, spyOn } from "bun:test";
import { eq } from "drizzle-orm";
import { join } from "node:path";
import app from "../../src/app";
import auth from "../../src/auth";
import { db } from "../../src/db";
import {
	helpOffers,
	helpRequests,
	user,
	volunteers,
} from "../../src/db/schema";
import { loadControllers } from "../../src/utils/controller";

describe("POST /api/tasks/:id/offers integration", () => {
	const requesterId = "it-owner-post-offers";
	const volunteerUserId = "it-volunteer-post-offers";
	let createdTaskId: number;
	let createdVolunteerId: number;
	let authSpy: any;

	beforeAll(async () => {
		const controllersPath = join(
			(import.meta as any).dir,
			"../../src/controllers",
		);
		await loadControllers(controllersPath);

		await db.insert(user).values([
			{
				id: requesterId,
				name: "Requester Integration",
				email: "it-owner-post-offers@example.com",
				emailVerified: true,
			},
			{
				id: volunteerUserId,
				name: "Volunteer Integration",
				email: "it-volunteer-post-offers@example.com",
				emailVerified: true,
			},
		]);

		const [volunteer] = await db
			.insert(volunteers)
			.values({
				userId: volunteerUserId,
				availability: true,
				trustScore: 99,
				completedTasks: 12,
			})
			.returning();
		createdVolunteerId = volunteer.id;

		const [task] = await db
			.insert(helpRequests)
			.values({
				requestedByUserId: requesterId,
				title: "Integration task for offers",
				description: "Task used by integration test for POST /tasks/:id/offers",
				urgency: "MEDIUM",
				status: "OPEN",
				anonymousMode: false,
			})
			.returning();
		createdTaskId = task.id;
	});

	afterAll(async () => {
		authSpy?.mockRestore();
		await db
			.delete(helpOffers)
			.where(eq(helpOffers.helpRequestId, createdTaskId));
		await db.delete(helpRequests).where(eq(helpRequests.id, createdTaskId));
		await db.delete(volunteers).where(eq(volunteers.id, createdVolunteerId));
		await db.delete(user).where(eq(user.id, volunteerUserId));
		await db.delete(user).where(eq(user.id, requesterId));
	});

	it("creates a pending offer and persists it in DB", async () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: volunteerUserId } as any,
			session: { id: "session-integration", userId: volunteerUserId } as any,
		});

		const response = await app.request(`/api/tasks/${createdTaskId}/offers`, {
			method: "POST",
			headers: {
				Authorization: "Bearer fake-test-token",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ message: "Integration offer message" }),
		});

		expect(response.status).toBe(201);
		const body: any = await response.json();
		expect(body).toMatchObject({
			data: {
				helpRequestId: createdTaskId,
				volunteerId: createdVolunteerId,
				message: "Integration offer message",
				status: "PENDING",
			},
			message: "Resource created successfully",
			statusCode: 201,
		});
		expect(body.data.id).toBeNumber();
		expect(body.data.createdAt).toBeString();

		const [fromDb] = await db
			.select()
			.from(helpOffers)
			.where(eq(helpOffers.id, body.data.id));

		expect(fromDb).toBeDefined();
		expect(fromDb).toMatchObject({
			id: body.data.id,
			helpRequestId: createdTaskId,
			volunteerId: createdVolunteerId,
			message: "Integration offer message",
			status: "PENDING",
		});
	});
});
