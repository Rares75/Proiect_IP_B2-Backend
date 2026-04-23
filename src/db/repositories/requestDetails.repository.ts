import { eq, and, count as drizzleCount } from "drizzle-orm";
import { db } from "../../db";
import { requestDetails } from "../requests";
import { IRepository } from "./base.repository";

export type HelpRequestDetails = typeof requestDetails.$inferSelect;
export type CreateHelpRequestDetailsDTO = typeof requestDetails.$inferInsert;
export type UpdateHelpRequestDetailsDTO = Partial<CreateHelpRequestDetailsDTO>;

export class HelpRequestDetailsRepository
    implements IRepository<HelpRequestDetails, CreateHelpRequestDetailsDTO, UpdateHelpRequestDetailsDTO, number> {
    async create(data: CreateHelpRequestDetailsDTO): Promise<HelpRequestDetails> {
        const [result] = await db.insert(requestDetails).values(data).returning();
        return result;
    }

    async findById(id: number): Promise<HelpRequestDetails | undefined> {
        const [result] = await db
            .select()
            .from(requestDetails)
            .where(eq(requestDetails.id, id));
        return result;
    }

    async findByHelpRequestId(helpRequestId: number): Promise<HelpRequestDetails | undefined> {
        const [result] = await db
            .select()
            .from(requestDetails)
            .where(eq(requestDetails.helpRequestId, helpRequestId));
        return result;
    }

    async findMany(limit: number = 50, offset: number = 0): Promise<HelpRequestDetails[]> {
        return await db.select().from(requestDetails).limit(limit).offset(offset);
    }

    async findFirstBy(criteria: Partial<HelpRequestDetails>): Promise<HelpRequestDetails | undefined> {
        const conditions = [];
        for (const [key, value] of Object.entries(criteria)) {
            if (value != undefined) {
                const column = requestDetails[key as keyof typeof requestDetails];
                conditions.push(eq(column as any, value));
            }
        }
        if (conditions.length === 0) return undefined;
        const [result] = await db
            .select()
            .from(requestDetails)
            .where(and(...conditions))
            .limit(1);
        return result;
    }

    async update(id: number, data: UpdateHelpRequestDetailsDTO): Promise<HelpRequestDetails | undefined> {
        const [result] = await db
            .update(requestDetails)
            .set(data)
            .where(eq(requestDetails.id, id))
            .returning();
        return result;
    }

    async updateByHelpRequestId(helpRequestId: number, data: UpdateHelpRequestDetailsDTO): Promise<HelpRequestDetails | undefined> {
        const [result] = await db
            .update(requestDetails)
            .set(data)
            .where(eq(requestDetails.helpRequestId, helpRequestId))
            .returning();
        return result;
    }

    async delete(id: number): Promise<boolean> {
        const result = await db
            .delete(requestDetails)
            .where(eq(requestDetails.id, id))
            .returning({ id: requestDetails.id });
        return result.length > 0;
    }

    async exists(id: number): Promise<boolean> {
        const [{ value }] = await db
            .select({ value: drizzleCount() })
            .from(requestDetails)
            .where(eq(requestDetails.id, id));
        return value > 0;
    }

    async count(): Promise<number> {
        const [{ value }] = await db
            .select({ value: drizzleCount() })
            .from(requestDetails);
        return value;
    }
}

export const helpRequestDetailsRepository = new HelpRequestDetailsRepository();