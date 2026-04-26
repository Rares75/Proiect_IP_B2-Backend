import { parseStatusFilter, parseCityFilter, type TaskFilterParams } from "../../filters";

type TaskSortBy = "createdAt" | "urgency";
type SortOrder = "ASC" | "DESC";

type ValidTasksQuery = {
	page: number;
	pageSize: number;
	sortBy: TaskSortBy;
	order: SortOrder;
	filters: TaskFilterParams;
};

export const validateTasksQuery = (
	query: Record<string, string | undefined>,
) => {
	const page = query.page ? Number(query.page) : 1;
	const pageSize = query.pageSize ? Number(query.pageSize) : 10;

	if (!Number.isInteger(page) || page < 1) {
		return { error: "Eroare: 'page' trebuie sa fie minim 1." };
	}
	if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
		return { error: "Eroare: 'pageSize' trebuie sa fie intre 1 si 100." };
	}

	const sortBy = query.sortBy ?? "createdAt";
	const order = query.order?.toUpperCase() ?? "DESC";

	const validSortFields: TaskSortBy[] = ["createdAt", "urgency"];
	const validOrders: SortOrder[] = ["ASC", "DESC"];

	if (!validSortFields.includes(sortBy as TaskSortBy)) {
		return {
			error: `Eroare: 'sortBy' accepta doar: ${validSortFields.join(", ")}.`,
		};
	}
	if (!validOrders.includes(order as SortOrder)) {
		return {
			error: `Eroare: 'order' accepta doar: ${validOrders.join(", ")}.`,
		};
	}

	const statusValidation = parseStatusFilter(query.status);
	if (statusValidation.error || !statusValidation.validData) {
		return { error: statusValidation.error };
	}

	const cityValidation = parseCityFilter(query.city);
    if (cityValidation.error) {
        return { error: cityValidation.error };
    }

	return {
		validData: {
			page,
			pageSize,
			sortBy: sortBy as TaskSortBy,
			order: order as SortOrder,
			filters: {
                ...statusValidation.validData,
                ...cityValidation.validData, 
            }
		} satisfies ValidTasksQuery,
	};
};
