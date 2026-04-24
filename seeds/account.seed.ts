import { account } from "../src/db/schema";
import type { EntitySeed } from "./types";
import { seedDate } from "./helpers";

export const accountSeed: EntitySeed = {
	name: "account",
	run: async (db, context) => {
		context.accounts = await db
			.insert(account)
			.values(
				context.users.map((user, index) => {
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
						createdAt: seedDate(index + 1),
						updatedAt: seedDate(index + 1, 11),
					};
				}),
			)
			.returning();
	},
};
