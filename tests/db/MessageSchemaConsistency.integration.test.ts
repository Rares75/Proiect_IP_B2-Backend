/// <reference types="bun-types" />
import { beforeAll, describe, expect, it } from "bun:test";
import { sql } from "drizzle-orm";
import { db } from "../../src/db";

describe("message and task assignment schema consistency", () => {
	let isDatabaseAvailable = true;

	beforeAll(async () => {
		try {
			const result = await db.execute(
				sql`select to_regclass('public.user') as user_table`,
			);
			isDatabaseAvailable = Boolean((result as any)[0]?.user_table);
		} catch {
			isDatabaseAvailable = false;
		}
	});

	it("allows guest-backed messages and nullable task assignment requester", async () => {
		if (!isDatabaseAvailable) {
			return;
		}

		const [messageGuestSessionColumn] = await db.execute(sql`
			select is_nullable
			from information_schema.columns
			where table_schema = 'public'
				and table_name = 'messages'
				and column_name = 'guest_session_id'
		`);

		const [messageSenderColumn] = await db.execute(sql`
			select is_nullable
			from information_schema.columns
			where table_schema = 'public'
				and table_name = 'messages'
				and column_name = 'sender_id'
		`);

		const [taskAssignmentRequesterColumn] = await db.execute(sql`
			select is_nullable
			from information_schema.columns
			where table_schema = 'public'
				and table_name = 'task_assignments'
				and column_name = 'requested_by_user_id'
		`);

		expect(messageGuestSessionColumn).toBeDefined();
		expect((messageGuestSessionColumn as any).is_nullable).toBe("YES");
		expect(messageSenderColumn).toBeDefined();
		expect((messageSenderColumn as any).is_nullable).toBe("YES");
		expect(taskAssignmentRequesterColumn).toBeDefined();
		expect((taskAssignmentRequesterColumn as any).is_nullable).toBe("YES");
	});
});
