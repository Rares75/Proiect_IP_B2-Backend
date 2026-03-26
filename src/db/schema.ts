	import { pgTable, uuid, text, timestamp, boolean, pgEnum }  from "drizzle-orm/pg-core";
	import {InferSelectModel} from "drizzle-orm";

	//asta o sa fie sters e doar de test

	export const TaskStatusEnum = pgEnum ("TaskStatus",
		["OPEN", "CLAIMED", "DONE"]);

	//define the schema for the "task" table (#TD: poate fi imbunatatit \_(*_*)_/)
	export const task = pgTable("task", {
		//auto-generated unique ID
		id: uuid("id").defaultRandom().primaryKey(),
		//title of the task, not null
		title: text("title").notNull(),

		//the status of the task, restricted to specific enum values ("open", "claimed", "done") (#TD: posibil)x
		status: TaskStatusEnum("status").notNull().default("OPEN"),

		//the date and time the task was created, not null, default to the current timestamp
		createdAt: timestamp("createdAt").notNull().defaultNow(),
		//the date and time of the last update. should be updated manually or via a database trigger whenever the row is modified
		updatedAt: timestamp("updatedAt").notNull().defaultNow(),
	});

	export type TaskType = InferSelectModel<typeof task>;
	export type TaskStatus = typeof TaskStatusEnum.enumValues[number];