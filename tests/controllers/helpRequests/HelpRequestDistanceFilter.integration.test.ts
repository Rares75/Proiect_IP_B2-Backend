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
import { inArray } from "drizzle-orm";
import { join } from "node:path";
import app from "../../../src/app";
import auth from "../../../src/auth";
import { db } from "../../../src/db";
import { helpRequests, requestLocations } from "../../../src/db/requests";
import { loadControllers } from "../../../src/utils/controller";
import { expectSuccessApiResponse } from "../apiResponseAssertions";

describe("GET /api/tasks distance filter integration", () => {
	let authSpy: ReturnType<typeof spyOn> | undefined;
	let createdTaskIds: number[] = [];
	let isDatabaseAvailable = true;

	beforeAll(async () => {
		const controllersPath = join(
			(import.meta as any).dir,
			"../../../src/controllers",
		);
		await loadControllers(controllersPath);

		try {
			await db.execute(sql`select 1`);
		} catch {
			isDatabaseAvailable = false;
		}
	});

	beforeEach(() => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "distance-filter-user", email: "distance@test.com" } as any,
			session: {
				id: "session-distance",
				userId: "distance-filter-user",
			} as any,
		});
	});

	afterEach(async () => {
		if (createdTaskIds.length > 0) {
			await db
				.delete(requestLocations)
				.where(inArray(requestLocations.helpRequestId, createdTaskIds));
			await db
				.delete(helpRequests)
				.where(inArray(helpRequests.id, createdTaskIds));
		}

		createdTaskIds = [];
		authSpy?.mockRestore();
		authSpy = undefined;
	});

	const createTaskWithLocation = async (
		title: string,
		location?: { x: number; y: number },
		city?: string,
	) => {
		const [task] = await db
			.insert(helpRequests)
			.values({
				title,
				description: `${title} description`,
				category: "FACE_TO_FACE",
			})
			.returning({ id: helpRequests.id });

		createdTaskIds.push(task.id);

		await db.insert(requestLocations).values({
			helpRequestId: task.id,
			city: city ?? title,
			location,
		});

		return task.id;
	};

	it("filters by ST_DWithin and excludes rows without geometry", async () => {
		if (!isDatabaseAvailable) {
			return;
		}

		const nearestId = await createTaskWithLocation("Nearest task", {
			x: 27.58,
			y: 47.15,
		});
		const middleId = await createTaskWithLocation("Middle task", {
			x: 27.59,
			y: 47.17,
		});
		await createTaskWithLocation(
			"City only task",
			undefined,
			"Task fara coordonate",
		);
		const farId = await createTaskWithLocation("Far task", {
			x: 27.8,
			y: 47.3,
		});

		const radiusOneResponse = await app.request(
			"/api/tasks?lat=47.15&lng=27.58&radius=1",
			{
				headers: { Authorization: "Bearer fake-test-token" },
			},
		);
		const radiusOneBody: any = await radiusOneResponse.json();

		expect(radiusOneResponse.status).toBe(200);
		expectSuccessApiResponse(radiusOneBody, {
			data: [expect.objectContaining({ id: nearestId })],
			meta: expect.objectContaining({ page: 1, pageSize: 10, total: 1 }),
		});

		const radiusTenResponse = await app.request(
			"/api/tasks?lat=47.15&lng=27.58&radius=10",
			{
				headers: { Authorization: "Bearer fake-test-token" },
			},
		);
		const radiusTenBody: any = await radiusTenResponse.json();

		expect(radiusTenResponse.status).toBe(200);
		expect(radiusTenBody.data.data).toHaveLength(2);
		expect(
			radiusTenBody.data.data.map((task: any) => task.id).sort((a: number, b: number) => a - b),
		).toEqual([nearestId, middleId].sort((a, b) => a - b));
		expect(radiusTenBody.data.data.some((task: any) => task.id === farId)).toBe(
			false,
		);
	});

	it("returns 200 with an empty data array when no tasks match the area", async () => {
		if (!isDatabaseAvailable) {
			return;
		}

		const response = await app.request(
			"/api/tasks?lat=44.4268&lng=26.1025&radius=1",
			{
				headers: { Authorization: "Bearer fake-test-token" },
			},
		);
		const body: any = await response.json();

		expect(response.status).toBe(200);
		expectSuccessApiResponse(body, {
			data: [],
			meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
		});
	});

	it("keeps sortBy priority when distance filter is active", async () => {
		if (!isDatabaseAvailable) {
			return;
		}

		const highUrgencyCloserId = await createTaskWithLocation(
			"High urgency closer task",
			{
				x: 27.58,
				y: 47.15,
			},
		);
		await db
			.update(helpRequests)
			.set({ urgency: "HIGH" })
			.where(eq(helpRequests.id, highUrgencyCloserId));

		const lowUrgencyFartherId = await createTaskWithLocation(
			"Low urgency farther task",
			{
				x: 27.595,
				y: 47.165,
			},
		);
		await db
			.update(helpRequests)
			.set({ urgency: "LOW" })
			.where(eq(helpRequests.id, lowUrgencyFartherId));

		const response = await app.request(
			"/api/tasks?lat=47.15&lng=27.58&radius=10&sortBy=urgency&order=ASC",
			{
				headers: { Authorization: "Bearer fake-test-token" },
			},
		);
		const body: any = await response.json();

		expect(response.status).toBe(200);
		expect(body.data.data.map((task: any) => task.id)).toEqual([
			lowUrgencyFartherId,
			highUrgencyCloserId,
		]);
	});
});
