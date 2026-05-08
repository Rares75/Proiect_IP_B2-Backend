/// <reference types="bun-types" />
import { describe, expect, it, beforeAll, spyOn, afterEach } from "bun:test";
import { join } from "node:path";
import app from "../../../src/app";
import { loadControllers } from "../../../src/utils/controller";
import { HelpRequestService } from "../../../src/services/HelpRequestService";

// Importam corect functiile voastre de asertiuni
import {
	expectClientErrorApiResponse,
	expectSuccessApiResponse,
	expectApiEnvelope,
} from "../apiResponseAssertions";

describe("POST /api/guest/tasks", () => {
	let serviceSpy: ReturnType<typeof spyOn> | undefined;

	beforeAll(async () => {
		const controllersPath = join(
			(import.meta as any).dir,
			"../../src/controllers",
		);
		await loadControllers(controllersPath);
	});

	afterEach(() => {
		if (serviceSpy) {
			serviceSpy.mockRestore();
			serviceSpy = undefined;
		}
	});

	const validUuid = "123e4567-e89b-12d3-a456-426614174000";
	const validBody = {
		title: "Am nevoie de ajutor urgent",
		description: "Sunt blocat pe strada X",
		status: "OPEN", // <-- ADĂUGAT: Obligatoriu pentru Zod
		location: { x: 44.4268, y: 26.1025 },
	};

	it("1. ar trebui sa returneze 401 daca lipseste header-ul X-Guest-Session", async () => {
		const response = await app.request("/api/guest/tasks", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(validBody),
		});

		expect(response.status).toBe(401);
		const body: any = await response.json();

		// Folosim assert-urile voastre
		expectApiEnvelope(body, 401);
		expect(body.isUnauthorized).toBe(true);
	});

	it("2. ar trebui sa returneze 400 daca X-Guest-Session nu este UUID valid", async () => {
		const response = await app.request("/api/guest/tasks", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Guest-Session": "abc-invalid-session",
			},
			body: JSON.stringify(validBody),
		});

		expect(response.status).toBe(400);
		const body: any = await response.json();

		// Folosim functia pentru Client Error cu mesajul specificat in controller
		expectClientErrorApiResponse(
			body,
			"Format invalid pentru X-Guest-Session. Trebuie să fie UUID.",
			400,
		);
	});

	it("3. ar trebui sa returneze 400 daca body contine urgency CRITICAL", async () => {
		const response = await app.request("/api/guest/tasks", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Guest-Session": validUuid,
			},
			body: JSON.stringify({ ...validBody, urgency: "CRITICAL" }),
		});

		expect(response.status).toBe(400);
		const body: any = await response.json();
		expectApiEnvelope(body, 400);
		expect(body.isClientError).toBe(true);
	});

	it("3b. ar trebui sa returneze 400 (strict) daca body contine 'category'", async () => {
		const response = await app.request("/api/guest/tasks", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Guest-Session": validUuid,
			},
			body: JSON.stringify({ ...validBody, category: "FACE_TO_FACE" }),
		});

		expect(response.status).toBe(400);
		const body: any = await response.json();
		expectApiEnvelope(body, 400);
		expect(body.isClientError).toBe(true);
	});

	it("4. ar trebui sa returneze 400 (strict) daca body contine 'anonymousMode'", async () => {
		const response = await app.request("/api/guest/tasks", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Guest-Session": validUuid,
			},
			body: JSON.stringify({ ...validBody, anonymousMode: false }),
		});

		expect(response.status).toBe(400);
		const body: any = await response.json();
		expectApiEnvelope(body, 400);
		expect(body.isClientError).toBe(true);
	});

	it("5. ar trebui sa returneze 400 daca lipseste description (schema invalidation)", async () => {
		const { description, ...bodyFaraDescriere } = validBody;

		const response = await app.request("/api/guest/tasks", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Guest-Session": validUuid,
			},
			body: JSON.stringify(bodyFaraDescriere),
		});

		expect(response.status).toBe(400);
		const body: any = await response.json();
		expectApiEnvelope(body, 400);
		expect(body.isClientError).toBe(true);
	});

	it("6. ar trebui sa returneze 429 daca limita de 3 task-uri a fost atinsa", async () => {
		const rateLimitError = new Error("Too many requests");
		rateLimitError.name = "RateLimitError";
		serviceSpy = spyOn(
			HelpRequestService.prototype,
			"createGuestHelpRequest",
		).mockRejectedValue(rateLimitError);

		const response = await app.request("/api/guest/tasks", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Guest-Session": validUuid,
			},
			body: JSON.stringify(validBody),
		});

		expect(response.status).toBe(429);
		const body: any = await response.json();
		expectApiEnvelope(body, 429);
		expect(body.message).toContain("Limita atinsă");
	});

	it("7. ar trebui sa returneze 201 + task creat corect cu CRITICAL si anonymousMode = true", async () => {
		const mockCreatedTask = {
			id: 100,
			title: validBody.title,
			description: validBody.description,
			guestSessionId: validUuid,
			requestedByUserId: null,
			urgency: "CRITICAL",
			anonymousMode: true,
			status: "OPEN",
		};

		serviceSpy = spyOn(
			HelpRequestService.prototype,
			"createGuestHelpRequest",
		).mockResolvedValue(mockCreatedTask as any);

		const response = await app.request("/api/guest/tasks", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Guest-Session": validUuid,
			},
			body: JSON.stringify(validBody),
		});

		expect(response.status).toBe(201);
		const body: any = await response.json();

		// Folosim functia voastra oficiala de Success API Response!
		expectSuccessApiResponse(body, mockCreatedTask, 201);
	});

	it("8. ar trebui sa accepte urgency LOW pentru guest", async () => {
		const mockCreatedTask = {
			id: 101,
			title: validBody.title,
			description: validBody.description,
			guestSessionId: validUuid,
			requestedByUserId: null,
			urgency: "LOW",
			anonymousMode: true,
			status: "OPEN",
		};

		serviceSpy = spyOn(
			HelpRequestService.prototype,
			"createGuestHelpRequest",
		).mockResolvedValue(mockCreatedTask as any);

		const response = await app.request("/api/guest/tasks", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Guest-Session": validUuid,
			},
			body: JSON.stringify({ ...validBody, urgency: "LOW" }),
		});

		expect(response.status).toBe(201);
		const body: any = await response.json();
		expectSuccessApiResponse(body, mockCreatedTask, 201);
	});
});
