import { describe, expect, test } from "bun:test";
import { createAnonymousAlias } from "../../src/utils/identityMapper";
import { sanitizeAnonymousTask } from "../../src/utils/taskMapper";

describe("sanitizeAnonymousTask", () => {
	const task = {
		id: 1,
		title: "Task",
		requestedByUserId: "owner-1",
		anonymousMode: false,
		ownerName: "Maria Ionescu",
		ownerUsername: "maria",
		ownerHiddenIdentity: true,
	};

	test("hides task owner identity when profile hiddenIdentity is enabled", () => {
		const result = sanitizeAnonymousTask(task, { userId: "other-user" });

		expect(result.requestedByUserId).toBeUndefined();
		expect(result.ownerName).toBeUndefined();
		expect(result.ownerUsername).toBeUndefined();
		expect(result.displayName).toBe(createAnonymousAlias("owner-1"));
		expect(result.ownerAlias).toBe(createAnonymousAlias("owner-1"));
		expect(result.isIdentityHidden).toBe(true);
	});

	test("shows the owner username for anonymousMode when available", () => {
		const result = sanitizeAnonymousTask(
			{ ...task, anonymousMode: true, ownerHiddenIdentity: false },
			{ userId: "other-user" },
		);

		expect(result.requestedByUserId).toBeUndefined();
		expect(result.displayName).toBe("maria");
		expect(result.displayName).not.toBe(createAnonymousAlias("owner-1"));
		expect(result.isIdentityHidden).toBe(true);
	});

	test("keeps real task owner identity visible to self", () => {
		const result = sanitizeAnonymousTask(task, { userId: "owner-1" });

		expect(result.requestedByUserId).toBe("owner-1");
		expect(result.ownerName).toBe("Maria Ionescu");
		expect(result.ownerUsername).toBe("maria");
		expect(result.displayName).toBe("Maria Ionescu");
		expect(result.isMine).toBe(true);
	});
});
