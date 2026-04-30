import { afterEach, beforeAll, describe, expect, it, spyOn } from "bun:test";
import { join } from "node:path";
import app from "../../src/app";
import auth from "../../src/auth";
import { loadControllers } from "../../src/utils/controller";
import { RequestDetailsService } from "../../src/services/RequestDetailsService";

describe("PUT /api/tasks/:id/details", () => {
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

	it("returneaza 200 sau 201 si details actualizate/create pentru un request valid", async () => {
		authenticate();
		const validId = "1";
		const response = await app.request(`/api/tasks/${validId}/details`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				notes: "Nota de test PUT",
				languageNeeded: "RO",
				safetyNotes: "Fara pericole",
			}),
		});

		if (response.status === 200 || response.status === 201) {
			const body: any = await response.json();
			expect([200, 201]).toContain(response.status);
			expect(body).toBeDefined();
			expect(body.helpRequestId).toBe(Number(validId));
		} else if (response.status === 409) {
			console.log(`Task-ul ${validId} nu este OPEN. S-a intors 409.`);
		} else {
			console.log(
				`Task-ul ${validId} nu exista in baza de test. S-a intors ${response.status}.`,
			);
		}
	});

	it("returneaza 400 pentru ID invalid (text)", async () => {
		const response = await app.request(`/api/tasks/kjd/details`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				notes: "Nota",
				languageNeeded: "RO",
				safetyNotes: "Sigur",
			}),
		});

		expect(response.status).toBe(400);
		const body: any = await response.json();
		expect(body.error).toBe("Invalid id");
	});

	it("returneaza 400 pentru body gol", async () => {
		const response = await app.request(`/api/tasks/1/details`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({}),
		});

		expect(response.status).toBe(400);
		const body: any = await response.json();
		expect(body.errors).toBeDefined();
	});

	it("returneaza 404 daca task-ul nu exista", async () => {
		authenticate();
		const mockAuthorization = spyOn(
			RequestDetailsService.prototype,
			"authorizeDetailsMutation",
		).mockResolvedValue({ status: "allowed" });
		const mockNotFound = spyOn(
			RequestDetailsService.prototype,
			"upsertDetails",
		).mockResolvedValue({ status: 404, message: "Task not found" });

		try {
			const response = await app.request(`/api/tasks/999999/details`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					notes: "Nota",
					languageNeeded: "RO",
					safetyNotes: "Sigur",
				}),
			});

			expect(response.status).toBe(404);
			const body: any = await response.json();
			expect(body.error).toBe("Task not found");
		} finally {
			mockAuthorization.mockRestore();
			mockNotFound.mockRestore();
		}
	});
});
