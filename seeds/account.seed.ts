import { account } from "../src/db/schema";
import type { EntitySeed } from "./types";
import { seedDate } from "./helpers";

const accountStatuses = ["ACTIVE", "LIMITED", "BLOCKED"] as const;

export const accountSeed: EntitySeed = {
	name: "account",
	run: async (db, context) => {
		context.accounts = await db
			.insert(account)
			.values(
				context.users.map((user, index) => {
					const blocked = index % 13 === 0;
					const limited = !blocked && index % 9 === 0;
					const status: (typeof accountStatuses)[number] = blocked
						? "BLOCKED"
						: limited
							? "LIMITED"
							: "ACTIVE";

					return {
						id: `account-${String(index + 1).padStart(3, "0")}`,
						accountId: `seed-account-${String(index + 1).padStart(3, "0")}`,
						providerId: "credentials",
						userId: user.id,
						accessToken: null,
						refreshToken: null,
						idToken: null,
						accessTokenExpiresAt: null,
						refreshTokenExpiresAt: null,
						scope: null,
						password: `seed-password-hash-${String(index + 1).padStart(3, "0")}`,
						status,
						banned_at: blocked ? seedDate(20 + index) : null,
						bannedReason: blocked ? "Repeated low ratings" : null,
						createdAt: seedDate(index + 1),
						updatedAt: seedDate(index + 1, 11),
					};
				}),
			)
			.returning();
	},
};
