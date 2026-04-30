import {
	afterEach,
	beforeEach,
	describe,
	expect,
	mock,
	spyOn,
	test,
} from "bun:test";
import { Hono } from "hono";
import { HelpRequestService } from "../../src/services/HelpRequestService";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import "../../src/app";
import auth from "../../src/auth";
import { Controller } from "../../src/di/decorators/controller";

const loadControllers = async (dir: string) => {
	const controllersDir = existsSync(dir)
		? dir
		: join(import.meta.dir, "../../src/controllers");
	for (const file of readdirSync(controllersDir)) {
		const fullPath = join(controllersDir, file);
		if (statSync(fullPath).isDirectory()) {
			await loadControllers(fullPath);
		} else if (file.endsWith(".ts")) {
			await import(fullPath);
		}
	}
};

mock.module("../../src/utils/controller", () => ({
	Controller,
	loadControllers,
}));

//const Controller = () => (_target: unknown) => {};

//trebuie neparat dupa mock)
const { HelpRequestController } = await import(
	"../../src/controllers/HelpRequestController"
);

type RequestStatus =
	| "OPEN"
	| "MATCHED"
	| "IN_PROGRESS"
	| "COMPLETED"
	| "CANCELLED"
	| "REJECTED";

type Task = { id: number; status: RequestStatus };

let store = new Map<number, Task>();

const seed = (task: Task) => {
	store.set(task.id, { ...task });
};

const repo = new Proxy(
	{},
	{
		get: (_target, property) => {
			if (property === "findById") {
				return async (id: number): Promise<Task | undefined> => {
					const found = store.get(id);
					return found ? { ...found } : undefined;
				};
			}

			if (property === "updateStatus") {
				return async (
					id: number,
					newStatus: RequestStatus,
				): Promise<Task | undefined> => {
					const current = store.get(id);
					if (!current) return undefined;
					const updated = { ...current, status: newStatus };
					store.set(id, updated);
					return { ...updated };
				};
			}

			return undefined;
		},
	},
);

const detailsRepo = {
	findByHelpRequestId: async () => undefined,
};

describe("PATCH /tasks/:id/status", () => {
	let app: Hono;
	let authSpy: ReturnType<typeof spyOn> | undefined;

	const patchStatus = (id: number, status: RequestStatus) =>
		app.request(`http://localhost/tasks/${id}/status`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ status }),
		});

	beforeEach(() => {
		authSpy?.mockRestore();
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-123" } as any,
			session: { id: "session-123", userId: "user-123" } as any,
		});
		store = new Map<number, Task>();

		const service = new HelpRequestService(repo as any, detailsRepo as any);
		const controller = new HelpRequestController(service as any);

		app = new Hono();
		app.route("/tasks", controller.controller);
	});

	afterEach(() => {
		authSpy?.mockRestore();
	});

	test("200 - valid Open -> Claimed (OPEN -> MATCHED)", async () => {
		seed({ id: 10, status: "OPEN" });

		const response = await patchStatus(10, "MATCHED");
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toMatchObject({ id: 10, status: "MATCHED" });

		const fromDb = store.get(10);
		expect(fromDb?.status).toBe("MATCHED");
	});

	test("200 - valid Claimed -> Done (echivalent flux actual: IN_PROGRESS -> COMPLETED)", async () => {
		seed({ id: 11, status: "IN_PROGRESS" });

		const response = await patchStatus(11, "COMPLETED");
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toMatchObject({ id: 11, status: "COMPLETED" });

		const fromDb = store.get(11);
		expect(fromDb?.status).toBe("COMPLETED");
	});

	test("409 - invalid Open -> Done (OPEN -> COMPLETED) cu mesaj explicit", async () => {
		seed({ id: 12, status: "OPEN" });

		const response = await patchStatus(12, "COMPLETED");
		const body = await response.json();

		expect(response.status).toBe(409);
		//trimitem neaparat eroarea mai departe
		expect(body).toEqual({
			error: "Invalid transition from OPEN to COMPLETED",
		});

		const unchanged = store.get(12);
		expect(unchanged?.status).toBe("OPEN");
	});

	test("409 - invalid Done -> Claimed (COMPLETED -> MATCHED) cu mesaj explicit", async () => {
		seed({ id: 13, status: "COMPLETED" });

		const response = await patchStatus(13, "MATCHED");
		const body = await response.json();

		expect(response.status).toBe(409);
		expect(body).toEqual({
			error: "Invalid transition from COMPLETED to MATCHED",
		});

		const unchanged = store.get(13);
		expect(unchanged?.status).toBe("COMPLETED");
	});

	test("404 - invalid id / task inexistent", async () => {
		const response = await patchStatus(999, "OPEN");

		const body = await response.json();

		expect(response.status).toBe(404);
		expect(body).toEqual({
			error: "HelpRequest with id 999 not found",
		});
	});
});
