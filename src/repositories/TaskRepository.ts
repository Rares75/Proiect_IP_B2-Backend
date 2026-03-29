import { db } from "../db/index"; 
import { helpRequest } from "../db/schema"; 
import { eq } from "drizzle-orm";

export class TaskRepository {
  async getOne(id: string) {
    const [result] = await db.select().from(helpRequest).where(eq(helpRequest.id, id));
    return result ?? null;
  }
}
export const taskRepository = new TaskRepository();