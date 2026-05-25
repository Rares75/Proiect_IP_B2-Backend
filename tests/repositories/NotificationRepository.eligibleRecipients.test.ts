import { afterEach, describe, expect, test } from "bun:test";
import { db } from "../../src/db";
import { NotificationRepository } from "../../src/db/repositories/notification.repository";

describe("NotificationRepository.findEligibleNewRequestRecipients", () => {
	const repo = new NotificationRepository();

	const originalSelect = (db as any).select;

	afterEach(() => {
		(db as any).select = originalSelect;
	});

	const makeSelectMock = (result: { userId: string }[]) => {
		(db as any).select = () => ({
			from: () => ({
				innerJoin: () => ({
					leftJoin: () => ({
						where: async () => result,
					}),
				}),
			}),
		});
	};

	test("returneaza lista goala cand nu exista voluntari eligibili", async () => {
		makeSelectMock([]);

		const result = await repo.findEligibleNewRequestRecipients([], null);

		expect(result).toEqual([]);
	});

	test("returneaza voluntarii eligibili", async () => {
		const expected = [{ userId: "user-1" }, { userId: "user-2" }];
		makeSelectMock(expected);

		const result = await repo.findEligibleNewRequestRecipients([], null);

		expect(result).toEqual(expected);
	});

	test("accepta skillsNeeded goale fara erori", async () => {
		makeSelectMock([]);

		expect(repo.findEligibleNewRequestRecipients([], null)).resolves.toEqual(
			[],
		);
	});

	test("accepta skillsNeeded ne-vide fara erori", async () => {
		makeSelectMock([{ userId: "user-1" }]);

		const result = await repo.findEligibleNewRequestRecipients(
			["transport", "prim-ajutor"],
			null,
		);

		expect(result).toHaveLength(1);
	});

	test("accepta location null fara erori", async () => {
		makeSelectMock([]);

		expect(
			repo.findEligibleNewRequestRecipients([], null),
		).resolves.toBeDefined();
	});

	test("accepta location valida fara erori", async () => {
		makeSelectMock([{ userId: "user-1" }]);

		const result = await repo.findEligibleNewRequestRecipients([], {
			x: 27.601,
			y: 47.158,
		});

		expect(result).toHaveLength(1);
	});

	test("accepta atat skills cat si location simultan fara erori", async () => {
		makeSelectMock([{ userId: "user-1" }, { userId: "user-2" }]);

		const result = await repo.findEligibleNewRequestRecipients(["transport"], {
			x: 27.601,
			y: 47.158,
		});

		expect(result).toHaveLength(2);
	});
});
