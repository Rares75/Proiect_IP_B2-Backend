import {
	and,
	asc,
	count as drizzleCount,
	desc,
	eq,
	type SQL,
} from "drizzle-orm";
import { db } from "../";
import { repository } from "../../di/decorators/repository";
import { helpRequests, requestDetails, requestLocations } from "../requests";
import type { IRepository } from "./base.repository";
import type { requestStatusEnum } from "../enums";
import {
	buildDistanceFilter,
	buildDistanceOrderBy,
	buildStatusFilter,
	type TaskFilterParams,
} from "../../filters";

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
				conditions.push(eq(column as never, value));
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

	async findPaginatedWithDetails(
		page: number,
		pageSize: number,
		sortBy: "createdAt" | "urgency" = "createdAt",
		order: "ASC" | "DESC" = "DESC",
		filters?: TaskFilterParams,
	) {
		//BE1-12 + BE1-13
		const offset = (page - 1) * pageSize;
		const statusFilter = filters ? buildStatusFilter(filters) : undefined;
		const distanceFilter = filters
			? buildDistanceFilter(filters.distance)
			: undefined;
		const whereClause = [statusFilter, distanceFilter].filter(Boolean) as SQL[];
		const composedWhere =
			whereClause.length > 0 ? and(...whereClause) : undefined;
		const distanceOrderBy = buildDistanceOrderBy(filters?.distance);
		const primarySort =
			order === "ASC"
				? asc(helpRequests[sortBy] as typeof helpRequests.createdAt)
				: desc(helpRequests[sortBy] as typeof helpRequests.createdAt);
		const orderBy = distanceOrderBy
			? [asc(distanceOrderBy), primarySort, desc(helpRequests.id)]
			: sortBy === "urgency"
				? [primarySort, desc(helpRequests.createdAt), desc(helpRequests.id)]
				: [primarySort, desc(helpRequests.id)];

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
			.leftJoin(
				requestLocations,
				eq(requestLocations.helpRequestId, helpRequests.id),
			)
			.where(composedWhere)
			.orderBy(...orderBy)
			.limit(pageSize)
			.offset(offset);

		const data = rows.map(({ helpRequest, requestDetails }) => ({
			...helpRequest,
			requestDetails,
		}));

		const countRows = await db
			.select({ value: drizzleCount() })
			.from(helpRequests)
			.leftJoin(
				requestLocations,
				eq(requestLocations.helpRequestId, helpRequests.id),
			)
			.where(composedWhere);

		const total = countRows[0]?.value ?? 0;

		return { data, total };
	}
}
