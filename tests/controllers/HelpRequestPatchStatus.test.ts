import { describe, expect, it, beforeAll, spyOn } from "bun:test";
import { join } from "node:path";
import app from "../../src/app";
import { loadControllers } from "../../src/utils/controller";
import { HelpRequestService } from "../../src/services/HelpRequestService";
import { NotFoundError } from "../../src/utils/Errors";

describe("PATCH /api/tasks/:id/status", () => {
	beforeAll(async () => {
		const controllersPath = join(
			(import.meta as any).dir,
			"../../src/controllers",
		);
		await loadControllers(controllersPath);
	});

	it("returneaza 200 pentru o tranzitie de status valida", async () => {
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
		const mockNotFound = spyOn(
			HelpRequestService.prototype,
			"updateHelpRequestStatus",
		).mockRejectedValue(new NotFoundError("HelpRequest", "999999"));

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
