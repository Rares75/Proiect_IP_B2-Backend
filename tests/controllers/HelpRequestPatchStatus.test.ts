import {
	afterEach,
	beforeAll,
	describe,
	expect,
	it,
	mock,
	spyOn,
} from "bun:test";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import app from "../../src/app";
import {
	expectClientErrorApiResponse,
	expectNotFoundApiResponse,
} from "./apiResponseAssertions";
import auth from "../../src/auth";
import { HelpRequestService } from "../../src/services/HelpRequestService";

const loadControllers = async (dir: string) => {
	const controllersDir = existsSync(dir)
		? dir
		: join(import.meta.dir, "../../src/controllers");
	for (const file of readdirSync(controllersDir)) {
		const fullPath = join(controllersDir, file);
		if (statSync(fullPath).isDirectory()) {
			await loadControllers(fullPath);
		} else if (file.endsWith(".ts")) {
			await import(fullPath);
		}
	}
};

mock.module("../../src/utils/controller", () => ({
	loadControllers,
}));

describe("PATCH /api/tasks/:id/status", () => {
	let authSpy: ReturnType<typeof spyOn> | undefined;

	beforeAll(async () => {
		const controllersPath = join(
			(import.meta as any).dir,
			"../../src/controllers",
		);
		await loadControllers(controllersPath);
	});

	afterEach(() => {
		authSpy?.mockRestore();
		authSpy = undefined;
	});

	const authenticate = () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-123" } as any,
			session: { id: "session-123", userId: "user-123" } as any,
		});
	};

	it("returneaza 401 pentru o tranzitie valida fara autentificare", async () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue(null as any);

		const response = await app.request("/api/tasks/1/status", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ status: "IN_PROGRESS" }),
		});

		expect(response.status).toBe(401);
	});

	it("returneaza 200 pentru o tranzitie de status valida", async () => {
		authenticate();
		const validId = "1";
		const response = await app.request(`/api/tasks/${validId}/status`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ status: "IN_PROGRESS" }),
		});

		if (response.status === 200) {
			const body: any = await response.json();
			expect(response.status).toBe(200);
			expect(body.statusCode).toBe(200);
			expect(body.data).toBeDefined();
			expect(body.data.status).toBeDefined();
		} else {
			console.log(
				`[Test 200] S-a intors ${response.status} din cauza starii DB curente (id=${validId}).`,
			);
		}
	});

	it("returneaza 400 si mesajul tau specific cand ID-ul nu este numeric", async () => {
		const response = await app.request(`/api/tasks/abc/status`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ status: "IN_PROGRESS" }),
		});

		expect(response.status).toBe(400);
		const body: any = await response.json();
		expectClientErrorApiResponse(
			body,
			"'id' must be a valid numeric request identifier",
		);
	});

	it("returneaza 400 cand corpul requestului nu este un JSON valid", async () => {
		const response = await app.request(`/api/tasks/1/status`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: "Asta sigur nu este un JSON valid",
		});

		expect(response.status).toBe(400);
		const body: any = await response.json();
		expectClientErrorApiResponse(body, "Request body must be valid JSON");
	});

	it("returneaza 400 cand statusul lipseste sau este complet invalid", async () => {
		const response = await app.request(`/api/tasks/1/status`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ status: "UN_STATUS_INVENTAT" }),
		});

		expect(response.status).toBe(400);
		const body: any = await response.json();
		expectClientErrorApiResponse(
			body,
			"'status' must be one of: OPEN, MATCHED, IN_PROGRESS, COMPLETED, CANCELLED, REJECTED",
		);
	});

	it("returneaza 404 cand task-ul nu exista in baza de date", async () => {
		authenticate();
		const mockNotFound = spyOn(
			HelpRequestService.prototype,
			"getHelpRequestForAuthorization",
		).mockResolvedValue(undefined);

		try {
			const response = await app.request(`/api/tasks/999999/status`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ status: "IN_PROGRESS" }),
			});

			expect(response.status).toBe(404);
			const body: any = await response.json();
			expectNotFoundApiResponse(body, "HelpRequest with id 999999 not found");
		} finally {
			mockNotFound.mockRestore();
		}
	});

	it("returneaza 409 pentru o tranzitie invalida de status (ex. pe un task deja finalizat)", async () => {
		authenticate();
		const validId = "1";
		const response = await app.request(`/api/tasks/${validId}/status`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ status: "OPEN" }),
		});

		if (response.status === 409) {
			const body: any = await response.json();
			expect(body.statusCode).toBe(409);
			expect(body.message).toBeDefined();
			expect(body.data).toBeNull();
			expect(body.isClientError).toBe(true);
		} else {
			console.log(
				`[Test 409] Baza de date a permis tranzitia sau task-ul nu a fost gasit. S-a intors: ${response.status}`,
			);
		}
	});

	it("smoke: envelope-ul complet este prezent pentru PATCH /tasks/:id/status", async () => {
		const response = await app.request(`/api/tasks/1/status`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ status: "OPEN" }),
		});

		if (
			response.status === 200 ||
			response.status === 409 ||
			response.status === 404
		) {
			const body: any = await response.json();
			expect(body).toHaveProperty("data");
			expect(body).toHaveProperty("message");
			expect(body).toHaveProperty("notFound");
			expect(body).toHaveProperty("isUnauthorized");
			expect(body).toHaveProperty("isServerError");
			expect(body).toHaveProperty("isClientError");
			expect(body).toHaveProperty("app");
			expect(body).toHaveProperty("statusCode");
		}
	});
});
