/// <reference types="bun-types" />
import { describe, expect, it, beforeAll } from "bun:test";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import app from "../../../src/app";
import { loadControllers } from "../../../src/utils/controller";
import { db } from "../../../src/db";
import { helpRequests } from "../../../src/db/requests";
import { eq } from "drizzle-orm";

describe("INTEGRATION: POST /api/guest/tasks Flow", () => {
	beforeAll(async () => {
		const controllersPath = join(
			(import.meta as any).dir,
			"../../src/controllers",
		);
		await loadControllers(controllersPath);
	}, 15000);

	// Folosim un UUID unic pentru a nu ne bate capul cu datele vechi din DB
	const testSessionId = randomUUID();
	const validBody = {
		title: "Test Integrare",
		description: "Testam rate limit-ul in DB",
		//status: "OPEN",
		location: { x: 44.0, y: 26.0 },
	};

	it("ar trebui sa respecte fluxul complet: 3 adaugari -> limitare 429 -> eliberare slot -> succes 201", async () => {
		// PASUL 1: Inseram 3 task-uri, ar trebui sa mearga toate (201)
		for (let i = 0; i < 3; i++) {
			const res = await app.request("/api/guest/tasks", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Guest-Session": testSessionId,
				},
				body: JSON.stringify(validBody),
			});
			expect(res.status).toBe(201);
		}

		// PASUL 2: Al 4-lea task trebuie sa primeasca 429 (Too Many Requests)
		const res4 = await app.request("/api/guest/tasks", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Guest-Session": testSessionId,
			},
			body: JSON.stringify(validBody),
		});
		expect(res4.status).toBe(429);

		// PASUL 3: Simulam un coleg care preia si completeaza un task direct in baza de date
		const tasksForThisSession = await db
			.select()
			.from(helpRequests)
			.where(eq(helpRequests.guestSessionId, testSessionId))
			.limit(1);

		// Setam primul task gasit ca "COMPLETED" (eliberam un "slot")
		await db
			.update(helpRequests)
			.set({ status: "COMPLETED" })
			.where(eq(helpRequests.id, tasksForThisSession[0].id));

		// PASUL 4: Incercam sa inseram din nou al 4-lea task. Acum trebuie sa mearga (201)
		const res5 = await app.request("/api/guest/tasks", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Guest-Session": testSessionId,
			},
			body: JSON.stringify({ ...validBody, title: "Slot eliberat" }),
		});

		expect(res5.status).toBe(201);

		const responseBody: any = await res5.json();
		expect(responseBody.data.guestSessionId).toBe(testSessionId);
	});
});
