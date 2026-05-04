import { afterEach, beforeEach, describe, expect, test, spyOn } from "bun:test";
import auth from "../../src/auth";

import { ProfileController } from "../../src/controllers/ProfileController";
import { NotFoundError } from "../../src/utils/Errors";

const makeApp = (mockService: any) => {
	const controller = new ProfileController(mockService as any);
	return controller.controller;
};

describe("ProfileController", () => {
	let app: any;
	let mockService: any;
	let authSpy: ReturnType<typeof spyOn> | undefined;

	afterEach(() => {
		authSpy?.mockRestore();
		authSpy = undefined;
	});

	beforeEach(() => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-1", email: "test@test.com" } as any,
			session: { userId: "user-1", id: "session-1" } as any,
		});

		mockService = {
			getProfileByUserId: async () => ({
				userId: "user-1",
				bio: "Hello",
				languages: ["ro"],
				hiddenIdentity: false,
			}),
			createProfile: async () => ({
				userId: "user-1",
				bio: "Hello",
				languages: ["ro"],
				hiddenIdentity: false,
			}),
			updateProfile: async () => ({
				userId: "user-1",
				bio: "Updated",
				languages: ["ro"],
				hiddenIdentity: false,
			}),
			deleteProfile: async () => true,
		};

		app = makeApp(mockService);
	});

	describe("GET /:userId", () => {
		test("should return 200 with profile when found", async () => {
			const res = await app.request("/user-1");
			const body = (await res.json()) as any;

			expect(res.status).toBe(200);
			expect(body.data).toMatchObject({ userId: "user-1", bio: "Hello" });
		});

		test("should return 404 when profile not found", async () => {
			mockService.getProfileByUserId = async () => {
				throw new NotFoundError("Profile", "user-1");
			};
			app = makeApp(mockService);

			const res = await app.request("/user-1");
			const body = (await res.json()) as any;

			expect(res.status).toBe(404);
			expect(body.notFound).toBe(true);
		});

		test("should return 500 on unexpected error", async () => {
			mockService.getProfileByUserId = async () => {
				throw new Error("Database error");
			};
			app = makeApp(mockService);

			const res = await app.request("/user-1");
			const body = (await res.json()) as any;

			expect(res.status).toBe(500);
			expect(body.isServerError).toBe(true);
		});
	});

	describe("POST /", () => {
		const validBody = {
			name: "Andrei",
			image: "https://example.com/avatar.png",
			bio: "Hello",
			languages: ["ro"],
			hiddenIdentity: false,
		};

		test("should return 201 when profile created successfully", async () => {
			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validBody),
			});
			const body = (await res.json()) as any;

			expect(res.status).toBe(201);
			expect(body.data).toMatchObject({ userId: "user-1" });
		});

		test("should return 400 on invalid body", async () => {
			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: "", image: "not-a-url" }),
			});
			const body = (await res.json()) as any;

			expect(res.status).toBe(400);
			expect(body.isClientError).toBe(true);
		});

		test("should return 401 when session is missing", async () => {
			authSpy?.mockRestore();
			authSpy = spyOn(auth.api, "getSession").mockResolvedValue(null as any);

			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validBody),
			});

			expect(res.status).toBe(401);
		});

		test("should return 404 when service throws NotFoundError", async () => {
			mockService.createProfile = async () => {
				throw new NotFoundError("User", "user-1");
			};
			app = makeApp(mockService);

			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validBody),
			});
			const body = (await res.json()) as any;

			expect(res.status).toBe(404);
			expect(body.notFound).toBe(true);
		});

		test("should return 500 on unexpected error", async () => {
			mockService.createProfile = async () => {
				throw new Error("Database error");
			};
			app = makeApp(mockService);

			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validBody),
			});
			const body = (await res.json()) as any;

			expect(res.status).toBe(500);
			expect(body.isServerError).toBe(true);
		});
	});

	describe("PUT /me", () => {
		test("should return 200 when profile updated successfully", async () => {
			const res = await app.request("/me", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ bio: "Updated bio" }),
			});
			const body = (await res.json()) as any;

			expect(res.status).toBe(200);
			expect(body.data).toMatchObject({ userId: "user-1" });
		});

		test("should return 400 on invalid body", async () => {
			const res = await app.request("/me", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: "", image: "not-a-url" }),
			});
			const body = (await res.json()) as any;

			expect(res.status).toBe(400);
			expect(body.isClientError).toBe(true);
		});

		test("should return 401 when session is missing", async () => {
			authSpy?.mockRestore();
			authSpy = spyOn(auth.api, "getSession").mockResolvedValue(null as any);

			const res = await app.request("/me", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ bio: "Updated" }),
			});

			expect(res.status).toBe(401);
		});

		test("should return 404 when profile not found", async () => {
			mockService.updateProfile = async () => {
				throw new NotFoundError("Profile", "user-1");
			};
			app = makeApp(mockService);

			const res = await app.request("/me", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ bio: "Updated" }),
			});
			const body = (await res.json()) as any;

			expect(res.status).toBe(404);
			expect(body.notFound).toBe(true);
		});

		test("should return 500 on unexpected error", async () => {
			mockService.updateProfile = async () => {
				throw new Error("Database error");
			};
			app = makeApp(mockService);

			const res = await app.request("/me", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ bio: "Updated" }),
			});
			const body = (await res.json()) as any;

			expect(res.status).toBe(500);
			expect(body.isServerError).toBe(true);
		});
	});

	describe("DELETE /me", () => {
		test("should return 200 with deleted true when successful", async () => {
			const res = await app.request("/me", { method: "DELETE" });
			const body = (await res.json()) as any;

			expect(res.status).toBe(200);
			expect(body.data).toMatchObject({ deleted: true });
		});

		test("should return 401 when session is missing", async () => {
			authSpy?.mockRestore();
			authSpy = spyOn(auth.api, "getSession").mockResolvedValue(null as any);

			const res = await app.request("/me", { method: "DELETE" });

			expect(res.status).toBe(401);
		});

		test("should return 404 when profile not found", async () => {
			mockService.deleteProfile = async () => {
				throw new NotFoundError("Profile", "user-1");
			};
			app = makeApp(mockService);

			const res = await app.request("/me", { method: "DELETE" });
			const body = (await res.json()) as any;

			expect(res.status).toBe(404);
			expect(body.notFound).toBe(true);
		});

		test("should return 500 on unexpected error", async () => {
			mockService.deleteProfile = async () => {
				throw new Error("Database error");
			};
			app = makeApp(mockService);

			const res = await app.request("/me", { method: "DELETE" });
			const body = (await res.json()) as any;

			expect(res.status).toBe(500);
			expect(body.isServerError).toBe(true);
		});
	});
});
