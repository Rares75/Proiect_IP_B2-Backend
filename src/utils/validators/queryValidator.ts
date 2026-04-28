import {
	parseDistanceFilter,
	parseLanguageFilter,
	parseStatusFilter,
	type TaskFilterParams,
} from "../../filters";

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

	////////////Filters

	const filters: TaskFilterParams = {};

	//status filter
	const statusValidation = parseStatusFilter(query.status);
	if (statusValidation.error || !statusValidation.validData) {
		return { error: statusValidation.error };
	}
	Object.assign(filters, statusValidation.validData);

	//distance filter
	const distanceValidation = parseDistanceFilter(query);
	if (distanceValidation.error || !distanceValidation.validData) {
		return { error: distanceValidation.error };
	}
	Object.assign(filters, distanceValidation.validData);

	//language filter
	const languageValidation = parseLanguageFilter(query.language);
	if (languageValidation.error) {
		return { error: languageValidation.error };
	}
	Object.assign(filters, languageValidation.validData);

	return {
		validData: {
			page,
			pageSize,
			sortBy: sortBy as TaskSortBy,
			order: order as SortOrder,
			//ca sa nu trebuiasca de fiecare data sa modificam acelasi loc si sa apara conflicte la fiecare merge
			filters,
		} satisfies ValidTasksQuery,
	};
};
