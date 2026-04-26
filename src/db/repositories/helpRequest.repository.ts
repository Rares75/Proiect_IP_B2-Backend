import {and, asc, count as drizzleCount, desc, eq} from "drizzle-orm";
import {db} from "../";
import {repository} from "../../di/decorators/repository";
import {helpRequests, requestDetails, requestLocations} from "../requests";
import type {IRepository} from "./base.repository";
import type {requestStatusEnum} from "../enums";
import {
    buildSkillMatchScore,
    buildLanguageFilter,
    buildStatusFilter,
    type TaskFilterParams,
} from "../../filters";

export type HelpRequest = typeof helpRequests.$inferSelect;
export type RequestLocation = typeof requestLocations.$inferSelect;

export type CreateHelpRequestDTO = typeof helpRequests.$inferInsert;

export type UpdateHelpRequestDTO = Partial<CreateHelpRequestDTO>;

@repository()
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
            .returning({id: helpRequests.id});
        return result.length > 0;
    }

    async exists(id: number): Promise<boolean> {
        const [{value}] = await db
            .select({value: drizzleCount()})
            .from(helpRequests)
            .where(eq(helpRequests.id, id));
        return value > 0;
    }

    async count(): Promise<number> {
        const [{value}] = await db
            .select({value: drizzleCount()})
            .from(helpRequests);
        return value;
    }

    async updateStatus(
        id: number,
        newStatus: (typeof requestStatusEnum.enumValues)[number],
    ): Promise<HelpRequest | undefined> {
        const [updated] = await db
            .update(helpRequests)
            .set({status: newStatus})
            .where(eq(helpRequests.id, id))
            .returning();
        return updated;
    }

    //BE1-12 + BE1-13
    async findPaginatedWithDetails(
        page: number,
        pageSize: number,
        sortBy: "createdAt" | "urgency" = "createdAt",
        order: "ASC" | "DESC" = "DESC",
        filters?: TaskFilterParams,
    ) {
        const offset = (page - 1) * pageSize;

        //filtrele
        const statusFilter = filters ? buildStatusFilter(filters) : undefined;
        const languageFilter = filters ? buildLanguageFilter(filters) : undefined;
        const skillScore = buildSkillMatchScore(filters ?? {});
        const shouldSortBySkillScore = Boolean(filters?.skills?.length);

        //group the filters into an array and remove any 'undefined' or null values
        const whereClause = [statusFilter, languageFilter].filter(Boolean);

        //if there are active filters, combine them
        const composedWhere =
            whereClause.length > 0 ? and(...whereClause) : undefined;
        const primarySort =
            order === "ASC" ? asc(helpRequests[sortBy]) : desc(helpRequests[sortBy]);
        //basic sorting by urgency level
        const orderBy =
            sortBy === "urgency"
                ? [primarySort, desc(helpRequests.createdAt), desc(helpRequests.id)]
                : [primarySort, desc(helpRequests.id)];

        //if skills - sort
        const secondaryOrderBy = shouldSortBySkillScore
            ? [desc(skillScore), ...orderBy]
            : orderBy;

        const rows = await db
            .select({
                helpRequest: helpRequests,
                requestDetails: requestDetails,
            })
            .from(helpRequests)
            .leftJoin(
                requestDetails,
                eq(requestDetails.helpRequestId, helpRequests.id),
            )
            .where(composedWhere)
            .orderBy(...secondaryOrderBy)
            .limit(pageSize)
            .offset(offset);

        const data = rows.map(({helpRequest, requestDetails}) => ({
            ...helpRequest,
            requestDetails,
        }));

        const countQuery = db
            .select({value: drizzleCount()})
            .from(helpRequests)
            .leftJoin(
                requestDetails,
                eq(requestDetails.helpRequestId, helpRequests.id),
            )
            .where(composedWhere);

        const [{value}] = await countQuery;
        const total = value;

        return {data, total};
    }
}
