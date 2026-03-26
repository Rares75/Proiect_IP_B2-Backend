import { db } from "@server/db";
import { task, type TaskType } from "@server/db/schema";
import { eq } from "drizzle-orm";
// @ts-ignore
import type { IRepository } from "./IRepository";

export class TaskRepository implements IRepository<TaskType> {

}

export const taskRepository = new TaskRepository();