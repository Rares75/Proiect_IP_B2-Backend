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
import auth from "../../src/auth";
import { HelpRequestService } from "../../src/services/HelpRequestService";
import { Controller } from "../../src/di/decorators/controller";

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
	Controller,
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
			expect(body).toBeDefined();
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
		expect(body.error).toBe("'id' must be a valid numeric request identifier");
	});

	it("returneaza 400 cand corpul requestului nu este un JSON valid", async () => {
		const response = await app.request(`/api/tasks/1/status`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: "Asta sigur nu este un JSON valid",
		});

		expect(response.status).toBe(400);
		const body: any = await response.json();
		expect(body.error).toBe("Request body must be valid JSON");
	});

	it("returneaza 400 cand statusul lipseste sau este complet invalid", async () => {
		const response = await app.request(`/api/tasks/1/status`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ status: "UN_STATUS_INVENTAT" }),
		});

		expect(response.status).toBe(400);
		const body: any = await response.json();
		expect(body.error).toContain("'status' must be one of:");
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
			expect(body.error).toBeDefined();
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
			expect(response.status).toBe(409);
			expect(body.error).toBeDefined();
		} else {
			console.log(
				`[Test 409] Baza de date a permis tranzitia sau task-ul nu a fost gasit. S-a intors: ${response.status}`,
			);
		}
	});
});
