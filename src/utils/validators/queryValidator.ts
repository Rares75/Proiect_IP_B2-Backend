import {
	parseLanguageFilter,
	parseSkillFilter,
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

type TaskQueryValue = string | string[] | undefined;

const getSingleQueryValue = (value: TaskQueryValue) =>
	Array.isArray(value) ? value[0] : value;

export const validateTasksQuery = (query: Record<string, TaskQueryValue>) => {
	const pageRaw = getSingleQueryValue(query.page);
	const pageSizeRaw = getSingleQueryValue(query.pageSize);
	const sortByRaw = getSingleQueryValue(query.sortBy);
	const orderRaw = getSingleQueryValue(query.order);
	const statusRaw = getSingleQueryValue(query.status);
	const languageRaw = getSingleQueryValue(query.language);

	const page = pageRaw ? Number(pageRaw) : 1;
	const pageSize = pageSizeRaw ? Number(pageSizeRaw) : 10;

	if (!Number.isInteger(page) || page < 1) {
		return { error: "Eroare: 'page' trebuie sa fie minim 1." };
	}
	if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
		return { error: "Eroare: 'pageSize' trebuie sa fie intre 1 si 100." };
	}

	const sortBy = sortByRaw ?? "createdAt";
	const order = orderRaw?.toUpperCase() ?? "DESC";

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
	const statusValidation = parseStatusFilter(statusRaw);
	if (statusValidation.error || !statusValidation.validData) {
		return { error: statusValidation.error };
	}
	Object.assign(filters, statusValidation.validData);

	//language filter
	const languageValidation = parseLanguageFilter(languageRaw);
	if (languageValidation.error) {
		return { error: languageValidation.error };
	}
	Object.assign(filters, languageValidation.validData);

	//skill filter
	const skillValidation = parseSkillFilter(query.skill);
	if (skillValidation.error) {
		return { error: skillValidation.error };
	}
	Object.assign(filters, skillValidation.validData);

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
