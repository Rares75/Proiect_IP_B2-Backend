import { describe, expect, test } from "bun:test";
import { UserAccessService } from "../../src/services/UserAccessService";

describe("UserAccessService", () => {
	test("returns the persisted status when a user access row exists", async () => {
		const service = new UserAccessService({
			findFirstBy: async ({ userId }: { userId: string }) =>
				userId === "user-1" ? { status: "BLOCKED" } : undefined,
		} as any);

		expect(await service.checkUserStatus("user-1")).toBe("BLOCKED");
	});

	test("defaults to ACTIVE when the user has no access override", async () => {
		const service = new UserAccessService({
			findFirstBy: async () => undefined,
		} as any);

		expect(await service.checkUserStatus("missing-user")).toBe("ACTIVE");
	});
});
