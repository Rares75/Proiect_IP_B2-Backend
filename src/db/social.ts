import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { type InferSelectModel, relations } from "drizzle-orm";
import { conversationStatusEnum, notificationTypeEnum } from "./enums";
import { taskAssignments } from "./requests";
import { user } from "./auth-schema";

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

export const ratings = pgTable("ratings", {
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
});

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
}));

export const ratingsRelations = relations(ratings, ({ one }) => ({
	taskAssignment: one(taskAssignments, {
		fields: [ratings.taskAssignmentId],
		references: [taskAssignments.id],
	}),
}));

export const interactionHistoriesRelations = relations(
	interactionHistories,
	({ one }) => ({
		taskAssignment: one(taskAssignments, {
			fields: [interactionHistories.taskAssignmentId],
			references: [taskAssignments.id],
		}),
	}),
);

export type RatingType = InferSelectModel<typeof ratings>;
export type ConversationType = InferSelectModel<typeof conversations>;
export type MessageType = InferSelectModel<typeof messages>;
export type InteractionHistoryType = InferSelectModel<
	typeof interactionHistories
>;
export type NotificationType = InferSelectModel<typeof notifications>;
