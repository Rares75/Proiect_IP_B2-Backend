import { describe, expect, test } from "bun:test";
import { HelpRequestService } from "../../src/services/HelpRequestService";
import { InvalidStatusTransitionError } from "../../src/utils/Errors";

type RequestStatus =
	| "OPEN"
	| "MATCHED"
	| "IN_PROGRESS"
	| "COMPLETED"
	| "CANCELLED"
	| "REJECTED";

type Task = { id: number; status: RequestStatus };

/**
 *
 */
class InMemoryHelpRequestRepo {
	private readonly store = new Map<number, Task>();

	seed(task: Task) {
		this.store.set(task.id, { ...task });
	}

	async findById(id: number): Promise<Task | undefined> {
		const found = this.store.get(id);
		return found ? { ...found } : undefined;
	}

	async updateStatus(
		id: number,
		newStatus: RequestStatus,
	): Promise<Task | undefined> {
		const current = this.store.get(id);
		if (!current) return undefined;
		const updated = { ...current, status: newStatus };
		this.store.set(id, updated);
		return { ...updated };
	}

	async create(data: any) {
		return data;
	}
}

const detailsRepo = {
	findByHelpRequestId: async () => undefined,
};

const moderationService = {
	scanContent: () => ({ level: "CLEAN" })
};

describe("HelpRequestService.updateHelpRequestStatus", () => {
	test("valid Open -> Claimed (OPEN -> MATCHED) actualizeaza statusul in repo", async () => {
		const repo = new InMemoryHelpRequestRepo();
		repo.seed({ id: 1, status: "OPEN" });
		const service = new HelpRequestService(repo as any, detailsRepo as any, moderationService as any);

		const updated = await service.updateHelpRequestStatus(1, "MATCHED");

		expect(updated.status).toBe("MATCHED");
		const fromDb = await repo.findById(1);
		expect(fromDb?.status).toBe("MATCHED");
	});

	test("valid Claimed -> Done (echivalent flux actual: IN_PROGRESS -> COMPLETED) actualizeaza statusul", async () => {
		const repo = new InMemoryHelpRequestRepo();
		repo.seed({ id: 2, status: "IN_PROGRESS" });
		const service = new HelpRequestService(repo as any, detailsRepo as any, moderationService as any);

		const updated = await service.updateHelpRequestStatus(2, "COMPLETED");

		expect(updated.status).toBe("COMPLETED");
		const fromDb = await repo.findById(2);
		expect(fromDb?.status).toBe("COMPLETED");
	});

	test("invalid Open -> Done (OPEN -> COMPLETED) arunca eroare explicita", async () => {
		const repo = new InMemoryHelpRequestRepo();
		repo.seed({ id: 3, status: "OPEN" });
		const service = new HelpRequestService(repo as any, detailsRepo as any, moderationService as any);

		expect(
			service.updateHelpRequestStatus(3, "COMPLETED"),
		).rejects.toMatchObject({
			name: "InvalidStatusTransitionError",
			message: "Invalid transition from OPEN to COMPLETED",
		});

		const unchanged = await repo.findById(3);
		expect(unchanged?.status).toBe("OPEN");
	});

	test("invalid Done -> Claimed (COMPLETED -> MATCHED) arunca eroare explicita", async () => {
		const repo = new InMemoryHelpRequestRepo();
		repo.seed({ id: 4, status: "COMPLETED" });
		const service = new HelpRequestService(repo as any, detailsRepo as any, moderationService as any);

		expect(
			service.updateHelpRequestStatus(4, "MATCHED"),
		).rejects.toBeInstanceOf(InvalidStatusTransitionError);
		expect(service.updateHelpRequestStatus(4, "MATCHED")).rejects.toMatchObject(
			{
				message: "Invalid transition from COMPLETED to MATCHED",
			},
		);

		const unchanged = await repo.findById(4);
		expect(unchanged?.status).toBe("COMPLETED");
	});
});
