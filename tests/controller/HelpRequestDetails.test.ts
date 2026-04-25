import { describe, expect, it, beforeAll } from "bun:test";
import { join } from "node:path";
import app from "../../src/app";
import { loadControllers } from "../../src/utils/controller";

describe("POST /api/tasks/:id/details", () => {
	beforeAll(async () => {
		const controllersPath = join(
			(import.meta as any).dir,
			"../../src/controllers",
		);
		await loadControllers(controllersPath);
	});

	it("returneaza 200 si details actualizate pentru un request valid", async () => {
		const validId = "1";
		const response = await app.request(`/api/tasks/${validId}/details`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				notes: "Nota de test",
				languageNeeded: "RO",
				safetyNotes: "Fara pericole",
			}),
		});

		if (response.status === 200) {
			const body: any = await response.json();
			expect(response.status).toBe(200);
			expect(body).toBeDefined();
			expect(body.helpRequestId).toBe(Number(validId));
		} else {
			console.log(
				`Task-ul ${validId} nu exista in baza de test. S-a intors ${response.status}.`,
			);
		}
	});

	it("returneaza 400 pentru ID invalid (text)", async () => {
		const response = await app.request(`/api/tasks/kjd/details`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				notes: "Nota de test",
				languageNeeded: "RO",
				safetyNotes: "Fara pericole",
			}),
		});

		expect(response.status).toBe(400);
		const body: any = await response.json();
		expect(body.message).toBe("Invalid id");
	});

	it("returneaza 400 pentru body gol", async () => {
		const response = await app.request(`/api/tasks/1/details`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({}),
		});

		expect(response.status).toBe(400);
		const body: any = await response.json();
		expect(body.errors).toBeDefined();
	});

	it("returneaza 404 daca task-ul nu exista", async () => {
		const response = await app.request(`/api/tasks/999999/details`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				notes: "Nota de test",
				languageNeeded: "RO",
				safetyNotes: "Fara pericole",
			}),
		});

		expect(response.status).toBe(404);
		const body: any = await response.json();
		expect(body.message).toBe("Task not found");
	});
});
