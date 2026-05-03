import { beforeEach, describe, expect, mock, test } from "bun:test";
import { Hono } from "hono";

// 1. Mock the Controller decorator
const Controller = () => (_target: unknown) => { };
mock.module("../../src/utils/controller", () => ({
    Controller,
}));

// 2. Mock the Auth Middleware so it doesn't block the test requests with 401s
mock.module("../../src/middlware/authMiddleware", () => ({
    authMiddleware: async (_c: unknown, next: () => Promise<void>) => await next(),
}));

// 3. Dynamically import the controller AFTER the mocks are set
const { HelpRequestController } = await import(
    "../../src/controllers/HelpRequestController"
);

describe("GET /tasks validation - City Filter", () => {
    let app: Hono;
    let getPaginatedTasks: ReturnType<typeof mock>;

    beforeEach(() => {
        // Mock the exact method used by the GET endpoint
        getPaginatedTasks = mock(async () => ({
            data: [],
            meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
        }));

        const controller = new HelpRequestController({
            getPaginatedTasks,
        } as any);

        app = new Hono();
        app.route("/tasks", controller.controller);
    });

    test("returns 200 and filtered list for a valid city", async () => {
        // Override mock return value specifically for this test
        getPaginatedTasks.mockResolvedValueOnce({
            data: [{ id: 1, title: "Need transport", locationCity: "Tokio" }],
            meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
        });

        const response = await app.request("http://localhost/tasks?city=Tokio", {
            method: "GET",
        });

        expect(response.status).toBe(200);

        // FIX: Assert the expected type to resolve the 'unknown' error
        const body = (await response.json()) as { data: any[] };

        expect(body.data).toHaveLength(1);
        expect(body.data[0].locationCity).toBe("Tokio");

        // Verify the service was called with the 'city' property in the filters argument
        const callArgs = getPaginatedTasks.mock.calls[0];
        const filtersArg = callArgs[4]; // filters is the 5th argument
        expect(filtersArg).toEqual(expect.objectContaining({ city: "Tokio" }));
    });

    test("returns 400 if city is sent but empty", async () => {
        // Send exactly ?city= with no value
        const response = await app.request("http://localhost/tasks?city=", {
            method: "GET",
        });

        expect(response.status).toBe(400);

        const body = (await response.json()) as { error: string };
        expect(body.error).toContain("city requires valid value"); expect(getPaginatedTasks).not.toHaveBeenCalled();
    });

    test("returns 400 if city contains only spaces", async () => {
        // %20 is the URL-encoded version of a space. 
        // This simulates a user typing 3 spaces: "?city=   "
        const response = await app.request("http://localhost/tasks?city=%20%20%20", {
            method: "GET",
        });

        expect(response.status).toBe(400);

        const body = (await response.json()) as { error: string };
        expect(body.error).toContain("city requires valid value"); 
        expect(getPaginatedTasks).not.toHaveBeenCalled();
    });

    test("returns 200 and an empty array if the city does not exist", async () => {
        // Service returns an empty array, simulating 0 database matches
        getPaginatedTasks.mockResolvedValueOnce({
            data: [],
            meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
        });

        const response = await app.request("http://localhost/tasks?city=OrasInexistent", {
            method: "GET",
        });

        expect(response.status).toBe(200);

        // FIX: Assert the expected type to resolve the 'unknown' error
        const body = (await response.json()) as { data: any[] };

        expect(body.data).toEqual([]); // Assert strict empty array
        expect(getPaginatedTasks).toHaveBeenCalledTimes(1);
    });

    test("applies no city filter if parameter is missing", async () => {
        getPaginatedTasks.mockResolvedValueOnce({
            data: [{ id: 1 }, { id: 2 }],
            meta: { page: 1, pageSize: 10, total: 2, totalPages: 1 },
        });

        // Request without the ?city query param
        const response = await app.request("http://localhost/tasks", {
            method: "GET",
        });

        expect(response.status).toBe(200);

        const callArgs = getPaginatedTasks.mock.calls[0];
        const filtersArg = callArgs[4];

        // Ensure the filter argument does not contain 'city'
        if (filtersArg) {
            expect(filtersArg).not.toHaveProperty("city");
        }
    });
});