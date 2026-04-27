/// <reference types="bun-types" />
import { afterEach, beforeAll, describe, expect, it, spyOn } from "bun:test";
import { join } from "node:path";
import app from "../../../src/app";
import auth from "../../../src/auth";
import { HelpRequestService } from "../../../src/services/HelpRequestService";
import { loadControllers } from "../../../src/utils/controller";
import { calculateSkillMachScore } from "../../../src/filters";

type RequestStatus =
	| "OPEN"
	| "MATCHED"
	| "IN_PROGRESS"
	| "COMPLETED"
	| "CANCELLED"
	| "REJECTED";

type SeedTask = {
	id: number;
	title: string;
	status: RequestStatus;
	createdAt: string;
	urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
	skillsNeeded: string[] | null;
	requestDetails: {
		languageNeeded: string | null;
	} | null;
};

const normalizeLanguage = (value: string) => value.trim().toLowerCase();

const seedTasks: SeedTask[] = [
	{
		id: 1,
		title: "Task cu sofer si traducator",
		status: "OPEN",
		createdAt: "2025-01-05T10:00:00.000Z",
		urgency: "HIGH",
		skillsNeeded: ["sofer", "traducator"],
		requestDetails: { languageNeeded: "RO" },
	},
	{
		id: 2,
		title: "Task cu sofer",
		status: "OPEN",
		createdAt: "2025-01-04T10:00:00.000Z",
		urgency: "MEDIUM",
		skillsNeeded: ["sofer"],
		requestDetails: { languageNeeded: "RO" },
	},
	{
		id: 3,
		title: "Task fara skillsNeeded",
		status: "OPEN",
		createdAt: "2025-01-03T10:00:00.000Z",
		urgency: "LOW",
		skillsNeeded: null,
		requestDetails: null,
	},
	{
		id: 4,
		title: "Task cu array gol",
		status: "OPEN",
		createdAt: "2025-01-02T10:00:00.000Z",
		urgency: "LOW",
		skillsNeeded: [],
		requestDetails: { languageNeeded: null },
	},
	{
		id: 5,
		title: "Task cu mecanic",
		status: "OPEN",
		createdAt: "2025-01-01T10:00:00.000Z",
		urgency: "LOW",
		skillsNeeded: ["mecanic"],
		requestDetails: { languageNeeded: "RO" },
	},
	{
		id: 6,
		title: "Task in alta limba",
		status: "MATCHED",
		createdAt: "2025-01-06T10:00:00.000Z",
		urgency: "CRITICAL",
		skillsNeeded: ["sofer"],
		requestDetails: { languageNeeded: "EN" },
	},
];

const hasExplicitLanguageMatch = (language: string) =>
	seedTasks.some(
		(task) =>
			task.requestDetails?.languageNeeded !== null &&
			task.requestDetails?.languageNeeded !== undefined &&
			normalizeLanguage(task.requestDetails.languageNeeded) === language,
	);

const matchesLanguage = (task: SeedTask, requestedLanguage: string) => {
	const taskLanguage = task.requestDetails?.languageNeeded;

	if (taskLanguage !== null && taskLanguage !== undefined) {
		return normalizeLanguage(taskLanguage) === requestedLanguage;
	}

	return hasExplicitLanguageMatch(requestedLanguage);
};

const sortByCreatedAt = (a: SeedTask, b: SeedTask, order: "ASC" | "DESC") => {
	const left = new Date(a.createdAt).getTime();
	const right = new Date(b.createdAt).getTime();
	if (left === right) return b.id - a.id;
	return order === "ASC" ? left - right : right - left;
};

const sortByUrgency = (a: SeedTask, b: SeedTask, order: "ASC" | "DESC") => {
	const urgencyRank: Record<SeedTask["urgency"], number> = {
		LOW: 0,
		MEDIUM: 1,
		HIGH: 2,
		CRITICAL: 3,
	};

	const left = urgencyRank[a.urgency];
	const right = urgencyRank[b.urgency];
	if (left === right) {
		const createdAtOrder = sortByCreatedAt(a, b, "DESC");
		return createdAtOrder === 0 ? b.id - a.id : createdAtOrder;
	}
	return order === "ASC" ? left - right : right - left;
};

const installSkillAwareMock = () =>
	spyOn(HelpRequestService.prototype, "getPaginatedTasks").mockImplementation(
		async (
			page: number,
			pageSize: number,
			sortBy: "createdAt" | "urgency" = "createdAt",
			order: "ASC" | "DESC" = "DESC",
			filters,
		) => {
			const effectiveOrder = order ?? "DESC";
			let rows = [...seedTasks];

			if (filters?.status) {
				rows = rows.filter((task) => task.status === filters.status);
			}

			if (filters?.language) {
				const normalizedLanguage = normalizeLanguage(filters.language);
				rows = rows.filter((task) => matchesLanguage(task, normalizedLanguage));
			}

			const requestedSkills = filters?.skills ?? [];
			rows.sort((a, b) => {
				if (requestedSkills.length > 0) {
					const scoreA = calculateSkillMachScore(requestedSkills, a.skillsNeeded);
					const scoreB = calculateSkillMachScore(requestedSkills, b.skillsNeeded);
					if (scoreA !== scoreB) {
						return scoreB - scoreA;
					}
				}

				if (sortBy === "urgency") {
					return sortByUrgency(a, b, effectiveOrder);
				}

				return sortByCreatedAt(a, b, effectiveOrder);
			});

			const total = rows.length;
			const start = (page - 1) * pageSize;
			const data = rows.slice(start, start + pageSize);

			return {
				data,
				meta: {
					page,
					pageSize,
					total,
					totalPages: Math.ceil(total / pageSize),
				},
			} as any;
		},
	);

beforeAll(async () => {
	await loadControllers(join(import.meta.dir, "../../src/controllers"));
});

describe("GET /api/tasks - filtrare si sortare dupa skill", () => {
	let authSpy: ReturnType<typeof spyOn> | undefined;
	let serviceSpy: ReturnType<typeof spyOn> | undefined;

	afterEach(() => {
		authSpy?.mockRestore();
		authSpy = undefined;

		serviceSpy?.mockRestore();
		serviceSpy = undefined;
	});

	const authenticate = () => {
		authSpy = spyOn(auth.api, "getSession").mockResolvedValue({
			user: { id: "user-123", email: "test@test.com" } as any,
			session: { id: "session-123" } as any,
		});
	};

	it("?skill=sofer → task-urile cu sofer sunt primele, iar task-urile fara skillsNeeded raman in rezultate", async () => {
		authenticate();
		serviceSpy = installSkillAwareMock();

		const response = await app.request("/api/tasks?skill=sofer", {
			headers: { Authorization: "Bearer fake-test-token" },
		});

		const body: any = await response.json();

		expect(response.status).toBe(200);
		expect(body.data).toHaveLength(5);
		expect(body.data[0].id).toBe(1);
		expect(body.data[1].id).toBe(2);
		expect(body.data[2].skillsNeeded).toBeNull();
		expect(body.data[3].skillsNeeded).toEqual([]);
		expect(body.data[4].skillsNeeded).toEqual(["mecanic"]);
		expect(body.meta.total).toBe(5);

		expect(serviceSpy).toHaveBeenCalledWith(1, 10, "createdAt", "DESC", {
			skills: ["sofer"],
		});
	});

	it("?skill=sofer&skill=traducator → task-ul cu ambele skill-uri apare inaintea celui cu un singur skill", async () => {
		authenticate();
		serviceSpy = installSkillAwareMock();

		const response = await app.request(
			"/api/tasks?skill=sofer&skill=traducator",
			{
				headers: { Authorization: "Bearer fake-test-token" },
			},
		);

		const body: any = await response.json();

		expect(response.status).toBe(200);
		expect(body.data[0].id).toBe(1);
		expect(body.data[1].id).toBe(2);
		expect(body.data[2].id).toBe(3);
		expect(body.meta.total).toBe(5);

		expect(serviceSpy).toHaveBeenCalledWith(1, 10, "createdAt", "DESC", {
			skills: ["sofer", "traducator"],
		});
	});

	it("?skill= → 400 cu mesaj descriptiv", async () => {
		authenticate();
		serviceSpy = installSkillAwareMock();

		const response = await app.request("/api/tasks?skill=", {
			headers: { Authorization: "Bearer fake-test-token" },
		});
		const body: any = await response.json();

		expect(response.status).toBe(400);
		expect(body).toEqual({ error: "Error: 'skill' cannot be empty" });
	});

	it("combina status + language + skill + paginare si pastreaza totalul complet", async () => {
		authenticate();
		serviceSpy = installSkillAwareMock();

		const response = await app.request(
			"/api/tasks?skill=sofer&status=OPEN&language=RO&page=2&pageSize=2",
			{
				headers: { Authorization: "Bearer fake-test-token" },
			},
		);

		const body: any = await response.json();

		expect(response.status).toBe(200);
		expect(body.meta.page).toBe(2);
		expect(body.meta.pageSize).toBe(2);
		expect(body.meta.total).toBe(5);
		expect(body.meta.totalPages).toBe(3);
		expect(body.data).toHaveLength(2);
		expect(body.data[0].id).toBe(3);
		expect(body.data[1].id).toBe(4);

		expect(serviceSpy).toHaveBeenCalledWith(2, 2, "createdAt", "DESC", {
			status: "OPEN",
			language: "ro",
			skills: ["sofer"],
		});
	});

	it("request neautentificat → 401", async () => {
		const response = await app.request("/api/tasks?skill=sofer");

		expect(response.status).toBe(401);
	});
});
