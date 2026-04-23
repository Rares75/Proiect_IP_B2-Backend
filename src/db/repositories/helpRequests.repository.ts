import { eq, and, count as drizzleCount } from "drizzle-orm";
import { db } from "../";
import { helpRequests, requestDetails } from "../requests";
import { IRepository } from "../repositories/base.repository";

export type HelpRequest = typeof helpRequests.$inferSelect;

export type CreateHelpRequestDTO = typeof helpRequests.$inferInsert;

export type UpdateHelpRequestDTO = Partial<CreateHelpRequestDTO>;

export class HelpRequestRepository
    implements IRepository<HelpRequest, CreateHelpRequestDTO, UpdateHelpRequestDTO, number> {
    async create(data: CreateHelpRequestDTO): Promise<HelpRequest> {
        const [newHelpRequest] = await db
            .insert(helpRequests)
            .values(data)
            .returning();
        return newHelpRequest;
    }

    async findById(id: number): Promise<HelpRequest | undefined> {
        const [found] = await db
            .select()
            .from(helpRequests)
            .where(eq(helpRequests.id, id));
        return found;
    }

    async findMany(limit: number = 50, offset: number = 0): Promise<HelpRequest[]> {
        return await db.select().from(helpRequests).limit(limit).offset(offset);
    }

    async findFirstBy(criteria: Partial<HelpRequest>): Promise<HelpRequest | undefined> {
        const conditions = [];

        for (const [key, value] of Object.entries(criteria)) {
            if (value != undefined) {
                const column = helpRequests[key as keyof typeof helpRequests];
                conditions.push(eq(column as any, value));
            }
        }

        if (conditions.length === 0) return undefined;

        const [found] = await db
            .select()
            .from(helpRequests)
            .where(and(...conditions))
            .limit(1);

        return found;
    }

    async update(id: number, data: UpdateHelpRequestDTO): Promise<HelpRequest | undefined> {
        const [updated] = await db
            .update(helpRequests)
            .set(data)
            .where(eq(helpRequests.id, id))
            .returning();
        return updated;
    }

    async delete(id: number): Promise<boolean> {
        const result = await db
            .delete(helpRequests)
            .where(eq(helpRequests.id, id))
            .returning({ id: helpRequests.id });
        return result.length > 0;
    }

    async findDetailsByHelpRequestId(
        helpRequestId: number,
    ): Promise<typeof requestDetails.$inferSelect | undefined> {
        const [details] = await db
            .select()
            .from(requestDetails)
            .where(eq(requestDetails.helpRequestId, helpRequestId));
        return details;
    }

    async deleteDetailsByHelpRequestId(helpRequestId: number): Promise<boolean> {
        const result = await db
            .delete(requestDetails)
            .where(eq(requestDetails.helpRequestId, helpRequestId))
            .returning({ id: requestDetails.id });
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
        const [{ value }] = await db
            .select({ value: drizzleCount() })
            .from(helpRequests);
        return value;
    }
}

export const helpRequestRepository = new HelpRequestRepository();
