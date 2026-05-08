// HelpRequestController.moderation.test.ts
import { describe, expect, it, beforeAll, spyOn, afterEach } from "bun:test";
import { join } from "node:path";
import app from "../../src/app";
import { loadControllers } from "../../src/utils/controller";
import auth from "../../src/auth";
import { HelpRequestRepository } from "../../src/db/repositories/helpRequest.repository"; 

describe("POST /api/tasks - Moderation Logic", () => {
	let authSpy: ReturnType<typeof spyOn> | undefined;
	let dbSpy: ReturnType<typeof spyOn> | undefined;

	beforeAll(async () => {
		// incarcam controllere in router
		const controllersPath = join(
			(import.meta as any).dir,
			"../../src/controllers",
		);
		await loadControllers(controllersPath);
	});

	afterEach(() => {
		authSpy?.mockRestore();
		dbSpy?.mockRestore();
		authSpy = undefined;
		dbSpy = undefined;
	});

	const authenticate = () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-123", email: "test@test.com" } as any,
			session: { id: "session-123", userId: "user-123" } as any,
		});
	};

	it("should return 400 with a specific reason when content is BLOCKED (Hard Block)", async () => {
		authenticate();
		dbSpy = spyOn(HelpRequestRepository.prototype, "create").mockResolvedValue({} as any);

		// 'scam' in blocklist ca "BLOCKED"
		const payload = {
            title: "This is a scam", 
            description: "Please fall for it",
            urgency: "LOW",
            anonymousMode: false,
            status: "OPEN",
            category: "FACE_TO_FACE",
            location: {
                x: 0.5,
                y: 0.5,
            }
        };

		const response = await app.request("/api/tasks", {
			method: "POST",
			headers: { 
				"Content-Type": "application/json",
				"Authorization": "Bearer fake-token" 
			},
			body: JSON.stringify(payload),
		});

		const body: any = await response.json();

		// verificam raspunsul
		expect(response.status).toBe(400);
		expect(body.statusCode).toBe(400);
		expect(body.isClientError).toBe(true);

		// verificam structura
		expect(body.data.level).toBe("BLOCKED");
		expect(body.data.reason).toBeDefined(); 
		expect(body.message).toBe("Content violates policies regarding financial scams.");
		
		expect(dbSpy).not.toHaveBeenCalled();
	});

	it("should return 201 with a warning message when content is FLAGGED (Soft Block)", async () => {
		authenticate();

		// mock db sa simulam un save
		const mockTask = { id: 1, title: "Let's talk about crypto", status: "OPEN" };
		dbSpy = spyOn(HelpRequestRepository.prototype, "create").mockResolvedValue(mockTask as any);

		// "crypto" in blacklist ca "FLAGGED"
		const payload = {
            title: "Let's talk about crypto",
            description: "Just a regular task",
            urgency: "LOW",
            anonymousMode: false,
            status: "OPEN",
            category: "FACE_TO_FACE",
            location: {
                x: 0.5,
                y: 0.5,
            }
        };

		const response = await app.request("/api/tasks", {
			method: "POST",
			headers: { 
				"Content-Type": "application/json",
				"Authorization": "Bearer fake-token" 
			},
			body: JSON.stringify(payload),
		});

		const body: any = await response.json();

		expect(response.status).toBe(201);
		
		expect(body.message).toContain("warning");
		expect(body.message).toContain("financial scams");

		expect(dbSpy).toHaveBeenCalled();
	});

	it("should return 201 cleanly when content is CLEAN", async () => {
		authenticate();

		const mockTask = { id: 2, title: "I need help with groceries", status: "OPEN" };
		dbSpy = spyOn(HelpRequestRepository.prototype, "create").mockResolvedValue(mockTask as any);

		const payload = {
            title: "I need help with groceries",
            description: "Can someone pick up some milk?",
            urgency: "MEDIUM",
            anonymousMode: false,
            // Add the missing required fields:
            status: "OPEN",
            category: "FACE_TO_FACE",
            location: {
                x: 0.5,
                y: 0.5,
            }
        };

		const response = await app.request("/api/tasks", {
			method: "POST",
			headers: { 
				"Content-Type": "application/json",
				"Authorization": "Bearer fake-token" 
			},
			body: JSON.stringify(payload),
		});

		const body: any = await response.json();

        console.log("DEBUG ERRORS:", JSON.stringify(body.data.errors, null, 2));

		expect(response.status).toBe(201);
		expect(body.message).not.toContain("warning");
		expect(dbSpy).toHaveBeenCalled();
	});
});