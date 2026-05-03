/// <reference types="bun-types" />
import { describe, expect, it, beforeAll, spyOn, afterEach } from "bun:test";
import { join } from "node:path";
import app from "../../src/app";
import { loadControllers } from "../../src/utils/controller";
import { HelpRequestService } from "../../src/services/HelpRequestService";
import { z } from "zod";

import {
    expectClientErrorApiResponse,
    expectSuccessApiResponse,
    expectApiEnvelope,
} from "./apiResponseAssertions";

describe("GET /api/guest/tasks", () => {
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

    const mockPaginatedResponse = {
        data: [
            {
                id: 1,
                title: "Ajutor transport",
                description: "Am nevoie de transport la clinică",
                category: "FACE_TO_FACE",
                urgency: "CRITICAL",
                anonymousMode: true,
                status: "OPEN",
                createdAt: new Date("2024-01-01").toISOString(),
                requestDetails: null,
                city: "Iași",
                addressText: "Strada Independenței 12",
                location: { x: 27.5849, y: 47.1585 },
            },
        ],
        meta: {
            page: 1,
            pageSize: 10,
            total: 1,
            totalPages: 1,
        },
    };

    it("1. ar trebui sa returneze 401 daca lipseste header-ul X-Guest-Session", async () => {
        const response = await app.request("/api/guest/tasks", {
            method: "GET",
        });

        expect(response.status).toBe(401);
        const body: any = await response.json();

        expectApiEnvelope(body, 401);
        expect(body.isUnauthorized).toBe(true);
        expect(body.message).toBe("No header X-Guest-Session");
    });

    it("2. ar trebui sa returneze 400 daca X-Guest-Session nu este UUID valid", async () => {
        const response = await app.request("/api/guest/tasks", {
            method: "GET",
            headers: { "X-Guest-Session": "not-a-uuid" },
        });

        expect(response.status).toBe(400);
        const body: any = await response.json();

        expectClientErrorApiResponse(
            body,
            "Invalid format for X-Guest-Session; must be: UUID.",
            400,
        );
    });

    it("3. ar trebui sa returneze 400 daca page nu este un numar valid", async () => {
        const response = await app.request("/api/guest/tasks?page=abc", {
            method: "GET",
            headers: { "X-Guest-Session": validUuid },
        });

        expect(response.status).toBe(400);
        const body: any = await response.json();

        expectApiEnvelope(body, 400);
        expect(body.isClientError).toBe(true);
        expect(body.message).toBe("Invalid query param");
    });

    it("4. ar trebui sa returneze 400 daca pageSize depaseste maximul", async () => {
        const response = await app.request("/api/guest/tasks?pageSize=999", {
            method: "GET",
            headers: { "X-Guest-Session": validUuid },
        });

        expect(response.status).toBe(400);
        const body: any = await response.json();
        expectApiEnvelope(body, 400);
    });

    it("5. ar trebui sa returneze 400 daca pageSize este 0 sau negativ", async () => {
        const response = await app.request("/api/guest/tasks?pageSize=0", {
            method: "GET",
            headers: { "X-Guest-Session": validUuid },
        });

        expect(response.status).toBe(400);
        const body: any = await response.json();
        expectApiEnvelope(body, 400);
    });

    it("6. ar trebui sa returneze 400 daca status nu este o valoare valida din enum", async () => {
        const response = await app.request("/api/guest/tasks?status=INVALID_STATUS", {
            method: "GET",
            headers: { "X-Guest-Session": validUuid },
        });

        expect(response.status).toBe(400);
        const body: any = await response.json();
        expectApiEnvelope(body, 400);
    });

    it("7. ar trebui sa returneze 200 cu lista paginata pentru un guest valid", async () => {
        serviceSpy = spyOn(
            HelpRequestService.prototype,
            "getGuestHelpRequests",
        ).mockResolvedValue(mockPaginatedResponse as any);

        const response = await app.request("/api/guest/tasks", {
            method: "GET",
            headers: { "X-Guest-Session": validUuid },
        });

        expect(response.status).toBe(200);
        const body: any = await response.json();

        expectSuccessApiResponse(body, mockPaginatedResponse, 200);
    });

    it("8. ar trebui sa returneze 200 cu valori default daca nu sunt trimisi params", async () => {
        serviceSpy = spyOn(
            HelpRequestService.prototype,
            "getGuestHelpRequests",
        ).mockResolvedValue(mockPaginatedResponse as any);

        await app.request("/api/guest/tasks", {
            method: "GET",
            headers: { "X-Guest-Session": validUuid },
        });

        expect(serviceSpy).toHaveBeenCalledWith(validUuid, 1, 10, undefined);
    });

    it("9. ar trebui sa transmita corect page, pageSize si status catre service", async () => {
        serviceSpy = spyOn(
            HelpRequestService.prototype,
            "getGuestHelpRequests",
        ).mockResolvedValue(mockPaginatedResponse as any);

        await app.request("/api/guest/tasks?page=2&pageSize=5&status=OPEN", {
            method: "GET",
            headers: { "X-Guest-Session": validUuid },
        });

        expect(serviceSpy).toHaveBeenCalledWith(validUuid, 2, 5, "OPEN");
    });

    it("10. ar trebui sa returneze 200 cu lista goala daca guestul nu are taskuri", async () => {
        const emptyResponse = {
            data: [],
            meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
        };

        serviceSpy = spyOn(
            HelpRequestService.prototype,
            "getGuestHelpRequests",
        ).mockResolvedValue(emptyResponse as any);

        const response = await app.request("/api/guest/tasks", {
            method: "GET",
            headers: { "X-Guest-Session": validUuid },
        });

        expect(response.status).toBe(200);
        const body: any = await response.json();

        expectSuccessApiResponse(body, emptyResponse, 200);
        expect(body.data.data).toHaveLength(0);
    });

    it("11. raspunsul NU trebuie sa contina requestedByUserId sau guestSessionId", async () => {
        serviceSpy = spyOn(
            HelpRequestService.prototype,
            "getGuestHelpRequests",
        ).mockResolvedValue(mockPaginatedResponse as any);

        const response = await app.request("/api/guest/tasks", {
            method: "GET",
            headers: { "X-Guest-Session": validUuid },
        });

        const body: any = await response.json();
        const tasks = body.data.data;

        tasks.forEach((task: any) => {
            expect(task).not.toHaveProperty("requestedByUserId");
            expect(task).not.toHaveProperty("guestSessionId");
        });
    });

    it("12. ar trebui sa returneze 500 daca service-ul arunca o eroare neasteptata", async () => {
        const consoleSpy = spyOn(console, "error").mockImplementation(() => {});
        
        serviceSpy = spyOn(
            HelpRequestService.prototype,
            "getGuestHelpRequests",
        ).mockRejectedValue(new Error("Database connection lost"));

        const response = await app.request("/api/guest/tasks", {
            method: "GET",
            headers: { "X-Guest-Session": validUuid },
        });

        expect(response.status).toBe(500);
        const body: any = await response.json();

        expectApiEnvelope(body, 500);
        expect(body.isServerError).toBe(true);
        
        consoleSpy.mockRestore();
    });
});