import { eq, and, count as drizzleCount } from "drizzle-orm";
import { db } from "../db/index";
import { helpRequests } from "../db/requests"; 
import type { IRepository } from "../db/repositories/base.repository";

export type HelpRequest = typeof helpRequests.$inferSelect;
export type CreateHelpRequestDTO = typeof helpRequests.$inferInsert;
export type UpdateHelpRequestDTO = Partial<CreateHelpRequestDTO>;

export class TaskRepository implements IRepository<HelpRequest, CreateHelpRequestDTO, UpdateHelpRequestDTO, number> {
    
    async create(data: CreateHelpRequestDTO): Promise<HelpRequest> {
        const [newTask] = await db.insert(helpRequests).values(data).returning();
        return newTask;
    }

    async findById(id: number): Promise<HelpRequest | undefined> {
        const [foundTask] = await db.select().from(helpRequests).where(eq(helpRequests.id, id));
        return foundTask;
    }

    async findMany(limit: number = 50, offset: number = 0): Promise<HelpRequest[]> {
        return await db.select().from(helpRequests).limit(limit).offset(offset);
    }

    async findFirstBy(criteria: Partial<HelpRequest>): Promise<HelpRequest | undefined> {
        const conditions = [];

        for (const [key, value] of Object.entries(criteria)) {
            if (value !== undefined) {
                const column = helpRequests[key as keyof typeof helpRequests];
                conditions.push(eq(column as any, value));
            }
        }

        if (conditions.length === 0) {
            return undefined;
        }

        const [foundTask] = await db
            .select()
            .from(helpRequests)
            .where(and(...conditions))
            .limit(1);

        return foundTask;
    }

    async update(id: number, data: UpdateHelpRequestDTO): Promise<HelpRequest | undefined> {
        const [updatedTask] = await db
            .update(helpRequests)
            .set(data) 
            .where(eq(helpRequests.id, id))
            .returning();
        return updatedTask;
    }

    async delete(id: number): Promise<boolean> {
        const result = await db.delete(helpRequests).where(eq(helpRequests.id, id)).returning({ id: helpRequests.id });
        return result.length > 0;
    }

    async exists(id: number): Promise<boolean> {
        const [{ value }] = await db
            .select({ value: drizzleCount() })
            .from(helpRequests)
            .where(eq(helpRequests.id, id));
        return value > 0;
    }

    async count(): Promise<number> {
        const [{ value }] = await db.select({ value: drizzleCount() }).from(helpRequests);
        return value;
    }
}

export const taskRepository = new TaskRepository();