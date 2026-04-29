/// <reference types="bun-types" />
import { describe, expect, it, beforeAll, afterEach } from "bun:test";
import { join } from "node:path";
import app from "../../src/app";
import { loadControllers } from "../../src/utils/controller";
import { db } from "../../src/db";
import { helpRequests, requestLocations } from "../../src/db/requests";
import { eq } from "drizzle-orm";
//import { HelpRequestController } from "../../src/controllers/HelpRequestController";

beforeAll(async () => {
	const controllersPath = join(
		(import.meta as any).dir,
		"../../src/controllers",
	);
	await loadControllers(controllersPath);
});

describe("POST /api/tasks (Integration BE1-34)", () => {
	let createdTaskIds: number[] = [];

	afterEach(async () => {
		for (const id of createdTaskIds) {
			await db
				.delete(requestLocations)
				.where(eq(requestLocations.helpRequestId, id));
			await db.delete(helpRequests).where(eq(helpRequests.id, id));
		}
		createdTaskIds = [];
	});

	it("POST /tasks cu body valid (title, description, urgency, anonymousMode, category, location) -> 201", async () => {
		const payload = {
			title: "Integration Test Task",
			description: "Need help moving boxes",
			urgency: "MEDIUM",
			status: "OPEN",
			anonymousMode: false,
			category: "FACE_TO_FACE",
			city: "Iasi",
			addressText: "Strada Palat 1",
			location: { x: 47.15, y: 27.58 },
		};

		const response = await app.request("/api/tasks", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});

		const body: any = await response.json();
		// Verificarea speciala:
		if (response.status === 500) {
			throw new Error(`EROARE BAZA DE DATE: ${JSON.stringify(body)}`);
		}
		expect(response.status).toBe(201);
		expect(body.id).toBeDefined();
		createdTaskIds.push(body.id);
	});

	it("POST /tasks cu skillsNeeded ['sofer', 'traducator'] -> 201 + persistat in DB", async () => {
		const payload = {
			title: "Skills Test Task",
			description: "Need driver and translator",
			urgency: "HIGH",
			status: "OPEN",
			anonymousMode: false,
			category: "FACE_TO_FACE", // Modificat din "Translation" in "FACE_TO_FACE"
			skillsNeeded: ["sofer", "traducator"],
			location: { x: 47.16, y: 27.59 },
		};

		const response = await app.request("/api/tasks", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});

		const body: any = await response.json();
		// Verificarea speciala:
        if (response.status === 500) {
            throw new Error(`EROARE BAZA DE DATE TEST 2: ${JSON.stringify(body)}`);
        }
		expect(response.status).toBe(201);
		createdTaskIds.push(body.id);

		const [dbTask] = await db
			.select()
			.from(helpRequests)
			.where(eq(helpRequests.id, body.id));

		expect(dbTask.skillsNeeded).toEqual(["sofer", "traducator"]);
	});

	it("POST /tasks cu category lipsa -> 400 + 'Category is required'", async () => {
		const payload = {
			title: "No Category Task",
			description: "This should fail",
			urgency: "LOW",
			status: "OPEN",
			anonymousMode: false,
			location: { x: 10, y: 10 },
		};

		const response = await app.request("/api/tasks", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});

		expect(response.status).toBe(400);
		const body: any = await response.json();

		const categoryError = body.errors.find((e: any) => e.field === "category");
		expect(categoryError).toBeDefined();
		expect(categoryError.message).toBe("Category is required");
	});

	it("POST /tasks fara location -> 400", async () => {
		const payload = {
			title: "No Location Task",
			description: "This should fail",
			urgency: "LOW",
			status: "OPEN",
			anonymousMode: false,
			category: "MESSAGES_ONLY", // Modificat din "Household" in "MESSAGES_ONLY"
		};

		const response = await app.request("/api/tasks", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});

		expect(response.status).toBe(400);
		const body: any = await response.json();
		expect(body.errors.some((e: any) => e.field === "location")).toBe(true);
	});

	it("POST /tasks cu location valida -> randul din request_locations creat cu helpRequestId corect", async () => {
		const payload = {
			title: "Location Insertion Test",
			description: "Testing atomic insertion",
			urgency: "LOW",
			status: "OPEN",
			anonymousMode: false,
			category: "FACE_TO_FACE", // Modificat din "Household" in "FACE_TO_FACE"
			city: "Iasi",
			addressText: "Centru",
			location: { x: 47.162, y: 27.588 },
		};

		const response = await app.request("/api/tasks", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});

		expect(response.status).toBe(201);
		const body: any = await response.json();
		const newTaskId = body.id;
		createdTaskIds.push(newTaskId);

		const [locationRecord] = await db
			.select()
			.from(requestLocations)
			.where(eq(requestLocations.helpRequestId, newTaskId));

		expect(locationRecord).toBeDefined();
		expect(locationRecord.city).toBe("Iasi");
		expect(locationRecord.addressText).toBe("Centru");
	});

	it("Daca INSERT in request_locations esueaza, randul din help_requests nu ramane (rollback)", async () => {
		const payload = {
			title: "Rollback Test Task",
			description: "Testing transaction rollback",
			urgency: "CRITICAL",
			status: "OPEN",
			anonymousMode: false,
			category: "FACE_TO_FACE", // Modificat din "Emergency" in "FACE_TO_FACE"
			location: { x: "INVALID_STRING", y: 0 },
		};

		const response = await app.request("/api/tasks", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});

		expect(response.status).toBe(400);

		const [dbTask] = await db
			.select()
			.from(helpRequests)
			.where(eq(helpRequests.title, "Rollback Test Task"));

		expect(dbTask).toBeUndefined();
	});

	it("GET /tasks/{id} dupa POST returneaza city, addressText, location populate (nu null)", async () => {
		const payload = {
			title: "GET Location Test",
			description: "Testing GET endpoint",
			urgency: "MEDIUM",
			status: "OPEN",
			anonymousMode: false,
			category: "FACE_TO_FACE",
			city: "Bucuresti",
			addressText: "Strada Victoriei",
			location: { x: 44.42, y: 26.1 },
		};

		const postResponse = await app.request("/api/tasks", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});
		expect(postResponse.status).toBe(201);
		const postBody: any = await postResponse.json();
		createdTaskIds.push(postBody.id);

		const getResponse = await app.request(`/api/tasks/${postBody.id}`);
		const getBody: any = await getResponse.json();

		expect(getResponse.status).toBe(200);
		expect(getBody.city).toBe("Bucuresti");
		expect(getBody.addressText).toBe("Strada Victoriei");
		expect(getBody.location).toEqual({ x: 44.42, y: 26.1 });
	});
});
