import { afterEach, beforeEach, describe, expect, test, spyOn } from "bun:test";
import auth from "../../src/auth";
import { BecomeVolunteerController } from "../../src/controllers/BecomeVolunteerController";
import { NotFoundError } from "../../src/utils/Errors";
import { VolunteerException } from "../../src/exceptions/volunteer/VolunteerException";

const makeApp = (mockService: any) => {
	const controller = new BecomeVolunteerController(mockService as any);
	return controller.controller;
};

describe("BecomeVolunteerController", () => {
	let app: any;
	let mockService: any;
	let authSpy: ReturnType<typeof spyOn> | undefined;

	beforeEach(() => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-1", email: "test@test.com" } as any,
			session: { userId: "user-1", id: "session-1" } as any,
		});

		mockService = {
			becomeVolunteer: async () => ({ id: 1, userId: "user-1" }),
		};

		app = makeApp(mockService);
	});

	afterEach(() => {
		authSpy?.mockRestore();
		authSpy = undefined;
	});

	describe("POST /become-volunteer", () => {
		test("should return 201 when user successfully becomes a volunteer", async () => {
			const res = await app.request("/become-volunteer", {
				method: "POST",
			});

			expect(res.status).toBe(201);
		});

		test("should return 401 when session is missing", async () => {
			authSpy?.mockRestore();
			authSpy = spyOn(auth.api, "getSession").mockResolvedValue(null as any);

			const res = await app.request("/become-volunteer", {
				method: "POST",
			});

			expect(res.status).toBe(401);
		});

		test("should return 409 when user is already a volunteer", async () => {
			mockService.becomeVolunteer = async () => {
				throw new VolunteerException("User is already a volunteer");
			};
			app = makeApp(mockService);

			const res = await app.request("/become-volunteer", {
				method: "POST",
			});
			const body = await res.json();

			expect(res.status).toBe(409);
			expect(body.isClientError).toBe(true);
		});

		test("should return 404 when user does not exist", async () => {
			mockService.becomeVolunteer = async () => {
				throw new NotFoundError("User", "user-1");
			};
			app = makeApp(mockService);

			const res = await app.request("/become-volunteer", {
				method: "POST",
			});
			const body = (await res.json()) as any;

			expect(res.status).toBe(404);
			expect(body.notFound).toBe(true);
		});

		test("should return 500 on unexpected error", async () => {
			mockService.becomeVolunteer = async () => {
				throw new Error("Database error");
			};
			app = makeApp(mockService);

			const res = await app.request("/become-volunteer", {
				method: "POST",
			});
			const body = (await res.json()) as any;

			expect(res.status).toBe(500);
			expect(body.isServerError).toBe(true);
		});
	});
});
