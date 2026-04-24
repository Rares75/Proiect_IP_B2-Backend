import { pgEnum } from "drizzle-orm/pg-core";

export const accountStatusEnum = pgEnum("account_status", [
	"ACTIVE",
	"LIMITED",
	"BLOCKED",
]);

export const verificationStatusEnum = pgEnum("verification_status", [
	"PENDING",
	"VERIFIED",
	"REJECTED",
]);

export const urgencyLevelEnum = pgEnum("urgency_level", [
	"LOW",
	"MEDIUM",
	"HIGH",
	"CRITICAL",
]);

export const requestStatusEnum = pgEnum("request_status", [
	"OPEN",
	"MATCHED",
	"IN_PROGRESS",
	"COMPLETED",
	"CANCELLED",
	"REJECTED",
]);

export const offerStatusEnum = pgEnum("offer_status", [
	"PENDING",
	"ACCEPTED",
	"REJECTED",
]);

export const assignmentStatusEnum = pgEnum("assignment_status", [
	"ASSIGNED",
	"STARTED",
	"COMPLETED",
	"CANCELLED",
]);

export const conversationStatusEnum = pgEnum("conversation_status", [
	"OPEN",
	"CLOSED",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
	"NEW_REQUEST",
	"OFFER_ACCEPTED",
	"TASK_UPDATED",
	"TASK_COMPLETED",
	"WARNING",
]);

export const helpRequestCategoryEnum = pgEnum("help_request_category", [
	"MESSAGES_ONLY",
	"FACE_TO_FACE",
]);
