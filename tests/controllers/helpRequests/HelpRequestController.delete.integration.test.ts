import { beforeEach, describe, expect, test, afterEach, spyOn } from "bun:test";
import { Hono } from "hono";
import auth from "../../../src/auth";
import { HelpRequestController } from "../../../src/controllers/HelpRequestController";
import { HelpOfferService } from "../../../src/services/HelpOfferService";
import { HelpRequestService } from "../../../src/services/HelpRequestService";
import { MessageService } from "../../../src/services/MessageService";

// Integration-like tests using in-memory repos to exercise the delete flow

describe("DELETE /tasks/:id - integration-like", () => {
	let app: Hono;
	let authSpy: ReturnType<typeof spyOn> | undefined;
	let store: Map<number, any>;
	let offers: Array<any>;
	let notificationsCreated: Array<any>;

	const makeReposAndServices = () => {
		store = new Map();
		offers = [];
		notificationsCreated = [];

		const helpRequestRepo = {
			findById: async (id: number) => {
				const v = store.get(id);
				return v ? { ...v } : undefined;
			},
			deleteWithOfferRejection: async (
				id: number,
				cb?: (tx: any, pendingOffers: any[]) => Promise<void>,
			) => {
				// atomically reject pending offers, notify inside the transaction,
				// then remove the task
				offers = offers.map((o) =>
					o.helpRequestId === id && o.status === "PENDING"
						? { ...o, status: "REJECTED" }
						: o,
				);
				const pending = offers
					.filter((o) => o.helpRequestId === id)
					.map((o) => ({
						id: o.id,
						volunteerId: o.volunteerId,
						volunteerUserId: o.volunteerUserId,
					}));
				if (cb) await cb({}, pending);
				store.delete(id);
				return { deleted: true, pendingOffers: pending };
			},
		};

		const helpOfferRepo = {
			findPendingByHelpRequestId: async (id: number) => {
				return offers.filter(
					(o) => o.helpRequestId === id && o.status === "PENDING",
				);
			},
		};

		const volunteerRepo = {} as any;
		const detailsRepo = {} as any;

		const notificationService = {
			notifyVolunteersPendingOffersCancelled: async (
				notifs: any[],
				_client?: any,
			) => {
				notificationsCreated.push(...notifs);
			},
		} as any;

		const moderationService = {} as any;

		const service = new HelpRequestService(
			helpRequestRepo as any,
			helpOfferRepo as any,
			volunteerRepo as any,
			detailsRepo as any,
			moderationService as any,
			notificationService as any,
		);

		return { service, helpRequestRepo, helpOfferRepo, notificationService };
	};

	beforeEach(() => {
		authSpy?.mockRestore();
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "owner-1" } as any,
			session: { id: "s-1", userId: "owner-1" } as any,
		});

		notificationsCreated = [];
	});

	afterEach(() => {
		authSpy?.mockRestore();
	});

	test("owner deletes OPEN -> offers rejected and notifications created (204)", async () => {
		const { service } = makeReposAndServices();

		store.set(1, {
			id: 1,
			requestedByUserId: "owner-1",
			status: "OPEN",
			title: "T1",
		});
		offers.push({
			id: 10,
			helpRequestId: 1,
			status: "PENDING",
			volunteerUserId: "vol-1",
		});
		offers.push({
			id: 11,
			helpRequestId: 1,
			status: "PENDING",
			volunteerUserId: "vol-2",
		});

		const controller = new HelpRequestController(
			service as any,
			HelpOfferService.prototype as any,
			MessageService.prototype as any,
		);
		app = new Hono();
		app.route("/tasks", controller.controller);

		const res = await app.request("http://localhost/tasks/1", {
			method: "DELETE",
		});
		expect(res.status).toBe(204);
		// notifications created for both volunteers
		expect(notificationsCreated.length).toBe(2);
		expect(notificationsCreated.map((n) => n.userId).sort()).toEqual(
			["vol-1", "vol-2"].sort(),
		);
		// offers should be rejected in the in-memory store
		expect(
			offers
				.filter((o) => o.helpRequestId === 1)
				.every((o) => o.status === "REJECTED"),
		).toBe(true);
		expect(store.has(1)).toBe(false);
	});

	test("owner deletes CANCELLED -> offers rejected and notifications created (204)", async () => {
		const { service } = makeReposAndServices();

		store.set(2, {
			id: 2,
			requestedByUserId: "owner-1",
			status: "CANCELLED",
			title: "T2",
		});
		offers.push({
			id: 20,
			helpRequestId: 2,
			status: "PENDING",
			volunteerUserId: "vol-3",
		});

		const controller = new HelpRequestController(
			service as any,
			HelpOfferService.prototype as any,
			MessageService.prototype as any,
		);
		app = new Hono();
		app.route("/tasks", controller.controller);

		const res = await app.request("http://localhost/tasks/2", {
			method: "DELETE",
		});
		expect(res.status).toBe(204);
		expect(notificationsCreated.length).toBe(1);
		expect(notificationsCreated[0].userId).toBe("vol-3");
		expect(offers.find((o) => o.id === 20)?.status).toBe("REJECTED");
		expect(store.has(2)).toBe(false);
	});

	test("blocked MATCHED -> 409 Conflict", async () => {
		const { service } = makeReposAndServices();
		store.set(3, {
			id: 3,
			requestedByUserId: "owner-1",
			status: "MATCHED",
			title: "T3",
		});

		const controller = new HelpRequestController(
			service as any,
			HelpOfferService.prototype as any,
			MessageService.prototype as any,
		);
		app = new Hono();
		app.route("/tasks", controller.controller);

		const res = await app.request("http://localhost/tasks/3", {
			method: "DELETE",
		});
		expect(res.status).toBe(409);
		expect(store.has(3)).toBe(true);
	});

	test("blocked IN_PROGRESS -> 409 Conflict", async () => {
		const { service } = makeReposAndServices();
		store.set(4, {
			id: 4,
			requestedByUserId: "owner-1",
			status: "IN_PROGRESS",
			title: "T4",
		});

		const controller = new HelpRequestController(
			service as any,
			HelpOfferService.prototype as any,
			MessageService.prototype as any,
		);
		app = new Hono();
		app.route("/tasks", controller.controller);

		const res = await app.request("http://localhost/tasks/4", {
			method: "DELETE",
		});
		expect(res.status).toBe(409);
		expect(store.has(4)).toBe(true);
	});

	test("non-owner -> 403 Forbidden", async () => {
		const { service } = makeReposAndServices();
		store.set(5, {
			id: 5,
			requestedByUserId: "other-user",
			status: "OPEN",
			title: "T5",
		});

		const controller = new HelpRequestController(
			service as any,
			HelpOfferService.prototype as any,
			MessageService.prototype as any,
		);
		app = new Hono();
		app.route("/tasks", controller.controller);

		const res = await app.request("http://localhost/tasks/5", {
			method: "DELETE",
		});
		expect(res.status).toBe(403);
		expect(store.has(5)).toBe(true);
	});

	test("task inexistent -> 404 Not Found", async () => {
		const { service } = makeReposAndServices();
		const controller = new HelpRequestController(
			service as any,
			HelpOfferService.prototype as any,
			MessageService.prototype as any,
		);
		app = new Hono();
		app.route("/tasks", controller.controller);

		const res = await app.request("http://localhost/tasks/999", {
			method: "DELETE",
		});
		expect(res.status).toBe(404);
	});
});
