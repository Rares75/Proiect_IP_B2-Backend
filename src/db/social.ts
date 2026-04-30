import { type InferSelectModel, relations } from "drizzle-orm";
import {
	index,
	integer,
	pgTable,
	serial,
	text,
	timestamp,
	unique,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import { accountStatusEnum, conversationStatusEnum, notificationTypeEnum } from "./enums";
import { helpRequests, taskAssignments } from "./requests";

export const conversations = pgTable("conversations", {
	id: serial("id").primaryKey(),
	taskAssignmentId: integer("task_assignment_id")
		.notNull()
		.unique()
		.references(() => taskAssignments.id, { onDelete: "cascade" }),
	status: conversationStatusEnum("status").notNull().default("OPEN"),
});

export const messages = pgTable("messages", {
	id: serial("id").primaryKey(),
	conversationId: integer("conversation_id")
		.notNull()
		.references(() => conversations.id, { onDelete: "cascade" }),
	senderId: text("sender_id")
		.notNull()
		.references(() => user.id),
	content: text("content").notNull(),
	sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ratings = pgTable(
	"ratings",
	{
		id: serial("id").primaryKey(),
		taskAssignmentId: integer("task_assignment_id")
			.notNull()
			.references(() => taskAssignments.id, { onDelete: "cascade" }),
		writtenByUserId: text("written_by_user_id")
			.notNull()
			.references(() => user.id),
		receivedByUserId: text("received_by_user_id")
			.notNull()
			.references(() => user.id),
		stars: integer("stars").notNull(),
		comment: text("comment"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		unique("ratings_assignment_author_recipient_unique").on(
			t.taskAssignmentId,
			t.writtenByUserId,
			t.receivedByUserId,
		),
	],
);

export const interactionHistories = pgTable("interaction_histories", {
	id: serial("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	taskAssignmentId: integer("task_assignment_id")
		.notNull()
		.references(() => taskAssignments.id, { onDelete: "cascade" }),
	date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
	summary: text("summary"),
});

export const notifications = pgTable("notifications", {
	id: serial("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	type: notificationTypeEnum("type").notNull(),
	text: text("text").notNull(),
	relatedRequestId: integer("related_request_id").references(
		() => helpRequests.id,
		{
			onDelete: "set null",
		},
	),
	relatedAssignmentId: integer("related_assignment_id").references(
		() => taskAssignments.id,
		{
			onDelete: "set null",
		},
	),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	readAt: timestamp("read_at", { withTimezone: true }),
});

export const conversationsRelations = relations(
	conversations,
	({ one, many }) => ({
		taskAssignment: one(taskAssignments, {
			fields: [conversations.taskAssignmentId],
			references: [taskAssignments.id],
		}),
		messages: many(messages),
	}),
);

export const messagesRelations = relations(messages, ({ one }) => ({
	conversation: one(conversations, {
		fields: [messages.conversationId],
		references: [conversations.id],
	}),
	sender: one(user, {
		fields: [messages.senderId],
		references: [user.id],
	}),
}));

export const ratingsRelations = relations(ratings, ({ one }) => ({
	taskAssignment: one(taskAssignments, {
		fields: [ratings.taskAssignmentId],
		references: [taskAssignments.id],
	}),
	writtenBy: one(user, {
		fields: [ratings.writtenByUserId],
		references: [user.id],
	}),
	receivedBy: one(user, {
		fields: [ratings.receivedByUserId],
		references: [user.id],
	}),
}));

export const interactionHistoriesRelations = relations(
	interactionHistories,
	({ one }) => ({
		taskAssignment: one(taskAssignments, {
			fields: [interactionHistories.taskAssignmentId],
			references: [taskAssignments.id],
		}),
		user: one(user, {
			fields: [interactionHistories.userId],
			references: [user.id],
		}),
	}),
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
	user: one(user, {
		fields: [notifications.userId],
		references: [user.id],
	}),
	relatedRequest: one(helpRequests, {
		fields: [notifications.relatedRequestId],
		references: [helpRequests.id],
	}),
	relatedAssignment: one(taskAssignments, {
		fields: [notifications.relatedAssignmentId],
		references: [taskAssignments.id],
	}),
}));

export type RatingType = InferSelectModel<typeof ratings>;
export type ConversationType = InferSelectModel<typeof conversations>;
export type MessageType = InferSelectModel<typeof messages>;
export type InteractionHistoryType = InferSelectModel<
	typeof interactionHistories
>;
export type NotificationType = InferSelectModel<typeof notifications>;


/**
 * Stores a log entry every time a user's account is disabled.
 * Used for auditing, preventing duplicate notifications, and
 * retrieving the disable reason later.
 */
export const disableNotifications = pgTable(
	"disable_notifications",
	{
		id: serial("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		reason: text("reason").notNull(),
		status: accountStatusEnum("status").notNull().default("BLOCKED"),
		notifiedAt: timestamp("notified_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("idx_disable_notifications_user_id").on(t.userId),
	],
);
 
export const disableNotificationsRelations = relations(
	disableNotifications,
	({ one }) => ({
		user: one(user, {
			fields: [disableNotifications.userId],
			references: [user.id],
		}),
	}),
);
 
export type DisableNotification = typeof disableNotifications.$inferSelect;
export type CreateDisableNotificationDTO =
	typeof disableNotifications.$inferInsert;