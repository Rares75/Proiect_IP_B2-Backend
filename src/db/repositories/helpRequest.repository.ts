import { eq, and, count as drizzleCount, type SQL } from "drizzle-orm";  
import { db } from "../";
import { repository } from "../../di/decorators/repository";
import { helpRequests, requestLocations } from "../requests";
import type { IRepository } from "./base.repository";
import type { requestStatusEnum } from "../enums";


export type HelpRequest = typeof helpRequests.$inferSelect;
export type RequestLocation = typeof requestLocations.$inferSelect;

export type CreateHelpRequestDTO = typeof helpRequests.$inferInsert;

export type UpdateHelpRequestDTO = Partial<CreateHelpRequestDTO>;

@repository()
export class HelpRequestRepository
	implements
		IRepository<HelpRequest, CreateHelpRequestDTO, UpdateHelpRequestDTO, number>
{
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

	async findLocationByHelpRequestId(
		helpRequestId: number,
	): Promise<RequestLocation | undefined> {
		const [found] = await db
			.select()
			.from(requestLocations)
			.where(eq(requestLocations.helpRequestId, helpRequestId));
		return found;
	}

	async findMany(
		limit: number = 50,
		offset: number = 0,
	): Promise<HelpRequest[]> {
		return await db.select().from(helpRequests).limit(limit).offset(offset);
	}

	async findFirstBy(
		criteria: Partial<HelpRequest>,
	): Promise<HelpRequest | undefined> {
		const conditions = [];

		for (const [key, value] of Object.entries(criteria)) {
			if (value !== undefined) {
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

	async update(
		id: number,
		data: UpdateHelpRequestDTO,
	): Promise<HelpRequest | undefined> {
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

    async updateStatus(
        id: number,
        newStatus: (typeof requestStatusEnum.enumValues)[number],
    ): Promise<HelpRequest | undefined> {
        const [updated] = await db
            .update(helpRequests)
            .set({ status: newStatus })
            .where(eq(helpRequests.id, id))
            .returning();
        return updated;
    }


    //BE1-12
    async findPaginatedWithDetails(page: number, pageSize: number, filters?: SQL) {
        const offset = (page - 1) * pageSize;

        const data = await db.query.helpRequests.findMany({
            limit: pageSize,
            offset: offset,
            where: filters, 
			orderBy: (helpRequests, { desc }) => [desc(helpRequests.id)],
            with: {
                requestDetails: true 
            }
        });

        const baseQuery = db.select({ value: drizzleCount() }).from(helpRequests);
        const countQuery = filters ? baseQuery.where(filters) : baseQuery;
        
        const [{ value }] = await countQuery;
        const total = value;

        return { data, total };
    }

	
}
