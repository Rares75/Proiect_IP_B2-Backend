import type { accountStatusEnum } from "./db/enums";
import type auth from "./auth";

export type RatingSummaryType = {
	averageRating: string | null;
	ratingsCount: number;
};

export type AccountStatusType = (typeof accountStatusEnum.enumValues)[number];
export type SessionData = typeof auth.$Infer.Session;
export type SessionType = SessionData["session"];
export type AuthUserType = SessionData["user"];
