import {
	afterEach,
	beforeEach,
	describe,
	expect,
	mock,
	spyOn,
	test,
} from "bun:test";
import { Hono } from "hono";
import auth from "../../../src/auth";
import { HelpRequestOffersForbiddenError } from "../../../src/services/HelpRequestService";
import { NotFoundError } from "../../../src/utils/Errors";
import {
	expectApiEnvelope,
	expectClientErrorApiResponse,
	expectNotFoundApiResponse,
	expectSuccessApiResponse,
} from "../apiResponseAssertions";

mock.module("../../src/utils/controller", () => ({
	Controller: () => (_target: unknown) => {},
}));

const { HelpRequestController } = await import(
	"../../../src/controllers/HelpRequestController"
);

describe("GET /api/tasks/:id/offers", () => {
	let app: Hono;
	let authSpy: ReturnType<typeof spyOn> | undefined;
	let getPaginatedOffersForTaskOwner: ReturnType<typeof mock>;

	beforeEach(() => {
		getPaginatedOffersForTaskOwner = mock();

		const controller = new HelpRequestController(
			{
				getPaginatedOffersForTaskOwner,
			} as any,
			{} as any,
		);

		app = new Hono().basePath("/api");
		app.route("/tasks", controller.controller);
	});

	afterEach(() => {
		authSpy?.mockRestore();
		authSpy = undefined;
	});

	const authenticate = (userId = "owner-user") => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: userId, email: "test@test.com" } as any,
			session: { id: "session-123", userId } as any,
		});
	};

	test("returns 401 without session", async () => {
		const response = await app.request("http://localhost/api/tasks/1/offers");
		const body: any = await response.json();

		expect(response.status).toBe(401);
		expectApiEnvelope(body, 401);
		expect(getPaginatedOffersForTaskOwner).not.toHaveBeenCalled();
	});

	test("returns 400 for invalid task id", async () => {
		authenticate();

		const response = await app.request(
			"http://localhost/api/tasks/abc/offers",
			{
				headers: { Authorization: "Bearer fake-test-token" },
			},
		);
		const body: any = await response.json();

		expect(response.status).toBe(400);
		expectClientErrorApiResponse(body, "Provide a real number", 400);
		expect(getPaginatedOffersForTaskOwner).not.toHaveBeenCalled();
	});

	test("returns 400 for invalid status", async () => {
		authenticate();

		const response = await app.request(
			"http://localhost/api/tasks/1/offers?status=INVALID_STATUS",
			{
				headers: { Authorization: "Bearer fake-test-token" },
			},
		);
		const body: any = await response.json();

		expect(response.status).toBe(400);
		expect(body.message).toContain("invalid status");
		expect(getPaginatedOffersForTaskOwner).not.toHaveBeenCalled();
	});

	test("returns 404 when task does not exist", async () => {
		authenticate();

		getPaginatedOffersForTaskOwner.mockRejectedValueOnce(
			new NotFoundError("HelpRequest", "99"),
		);

		const response = await app.request("http://localhost/api/tasks/99/offers", {
			headers: { Authorization: "Bearer fake-test-token" },
		});
		const body: any = await response.json();

		expect(response.status).toBe(404);
		expectNotFoundApiResponse(body, "the task does not exist", 404);
	});

	test("returns 403 when user is not owner", async () => {
		authenticate("random-user");

		getPaginatedOffersForTaskOwner.mockRejectedValueOnce(
			new HelpRequestOffersForbiddenError(),
		);

		const response = await app.request("http://localhost/api/tasks/1/offers", {
			headers: { Authorization: "Bearer fake-test-token" },
		});
		const body: any = await response.json();

		expect(response.status).toBe(403);
		expect(body.message).toBe("You don't have permission to see this task.");
	});

	test("returns 200 and forwards pagination to the service", async () => {
		authenticate();

		const mockResult = {
			data: [
				{
					id: 10,
					volunteerId: 5,
					message: "Pot ajuta!",
					status: "PENDING",
					createdAt: "2026-04-28T10:00:00Z",
					volunteer: {
						username: "volunteer1",
						trustScore: 4.8,
						averageRating: 5,
						bio: "Sunt disponibil",
						name: "Ion Popescu",
					},
				},
			],
			meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
		};

		getPaginatedOffersForTaskOwner.mockResolvedValueOnce(mockResult);

		const response = await app.request(
			"http://localhost/api/tasks/1/offers?status=PENDING&page=1&pageSize=10",
			{
				headers: { Authorization: "Bearer fake-test-token" },
			},
		);
		const body: any = await response.json();

		expect(response.status).toBe(200);
		expectSuccessApiResponse(body, mockResult, 200);
		expect(getPaginatedOffersForTaskOwner).toHaveBeenCalledWith(
			1,
			"owner-user",
			1,
			10,
			"PENDING",
		);
	});
});
