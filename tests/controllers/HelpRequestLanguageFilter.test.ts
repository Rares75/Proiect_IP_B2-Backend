/// <reference types="bun-types" />
import {afterEach, beforeAll, describe, expect, it, spyOn} from "bun:test";
import {join} from "node:path";
import app from "../../src/app";
import auth from "../../src/auth";
import {HelpRequestService} from "../../src/services/HelpRequestService";
import {loadControllers} from "../../src/utils/controller";

beforeAll(async () => {
    await loadControllers(join(import.meta.dir, "../../src/controllers"));
});

describe("GET /api/tasks language filter", () => {
    let authSpy: ReturnType<typeof spyOn> | undefined;

    afterEach(() => {
        authSpy?.mockRestore();
        authSpy = undefined;
    });

    const authenticate = () => {
        authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
            user: {id: "user-123", email: "test@test.com"} as any,
            session: {id: "session-123"} as any,
        });
    };

    it("returns 200 with empty data array for unknown language (?language=ZZ)", async () => {
        authenticate();
        const serviceSpy = spyOn(
            HelpRequestService.prototype,
            "getPaginatedTasks",
        ).mockResolvedValue({
            data: [],
            meta: {page: 1, pageSize: 10, total: 0, totalPages: 0},
        });

        try {
            const response = await app.request("/api/tasks?language=ZZ", {
                headers: {Authorization: "Bearer fake-test-token"},
            });
            const body: any = await response.json();

            expect(response.status).toBe(200);
            expect(body.data).toEqual([]);
            expect(body.meta.total).toBe(0);

            // language este normalizat la lowercase de validator
            expect(serviceSpy).toHaveBeenCalledWith(1, 10, "createdAt", "DESC", {
                language: "zz",
            });
        } finally {
            serviceSpy.mockRestore();
        }
    });

    it("returns 400 with explicit error when language is empty (?language=)", async () => {
        authenticate();

        const response = await app.request("/api/tasks?language=", {
            headers: {Authorization: "Bearer fake-test-token"},
        });
        const body: any = await response.json();

        expect(response.status).toBe(400);
        expect(body).toEqual({
            error: "Error: 'language' cannot be empty",
        });
    });

    it("includes tasks without requestDetails in response for a valid language", async () => {
        authenticate();
        const serviceSpy = spyOn(
            HelpRequestService.prototype,
            "getPaginatedTasks",
        ).mockResolvedValue({
            data: [
                {
                    id: 1,
                    title: "Task fara details",
                    status: "OPEN",
                    requestDetails: null,
                } as any,
                {
                    id: 2,
                    title: "Task cu languageNeeded null",
                    status: "OPEN",
                    requestDetails: {id: 22, helpRequestId: 2, languageNeeded: null},
                } as any,
                {
                    id: 3,
                    title: "Task cu languageNeeded RO",
                    status: "OPEN",
                    requestDetails: {id: 33, helpRequestId: 3, languageNeeded: "RO"},
                } as any,
            ],
            meta: {page: 1, pageSize: 10, total: 3, totalPages: 1},
        });

        try {
            const response = await app.request("/api/tasks?language=RO", {
                headers: {Authorization: "Bearer fake-test-token"},
            });
            const body: any = await response.json();

            expect(response.status).toBe(200);
            expect(body.data).toHaveLength(3);
            expect(body.data[0].requestDetails).toBeNull();

            expect(serviceSpy).toHaveBeenCalledWith(1, 10, "createdAt", "DESC", {
                language: "ro",
            });
        } finally {
            serviceSpy.mockRestore();
        }
    });

    it("treats language case-insensitively (?language=ro -> filters.language='ro')", async () => {
        authenticate();
        const serviceSpy = spyOn(
            HelpRequestService.prototype,
            "getPaginatedTasks",
        ).mockResolvedValue({
            data: [{id: 10, status: "OPEN"} as any],
            meta: {page: 1, pageSize: 10, total: 1, totalPages: 1},
        });

        try {
            const response = await app.request("/api/tasks?language=ro", {
                headers: {Authorization: "Bearer fake-test-token"},
            });

            expect(response.status).toBe(200);
            expect(serviceSpy).toHaveBeenCalledWith(1, 10, "createdAt", "DESC", {
                language: "ro",
            });
        } finally {
            serviceSpy.mockRestore();
        }
    });
});
