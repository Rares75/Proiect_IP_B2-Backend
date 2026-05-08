import {
	parseDistanceFilter,
	parseLanguageFilter,
	parseStatusFilter,
	parseCityFilter,
	parseSkillFilter,
	parseCategoryFilter,
	type TaskFilterParams,
} from "../../filters";

type TaskSortBy = "createdAt" | "urgency";
type SortOrder = "ASC" | "DESC";
type TaskQueryValue = string | string[] | undefined;

type ValidTasksQuery = {
	page: number;
	pageSize: number;
	sortBy: TaskSortBy;
	order: SortOrder;
	filters: TaskFilterParams;
};
//for offers
type OfferStatus = "PENDING" | "ACCEPTED" | "REJECTED";
type ValidOffersQuery = {
	page: number;
	pageSize: number;
	status?: OfferStatus;
};

const getSingleQueryValue = (value: TaskQueryValue) =>
	Array.isArray(value) ? value[0] : value;

export const validateTasksQuery = (query: Record<string, TaskQueryValue>) => {
	const pageRaw = getSingleQueryValue(query.page);
	const pageSizeRaw = getSingleQueryValue(query.pageSize);
	const sortByRaw = getSingleQueryValue(query.sortBy);
	const orderRaw = getSingleQueryValue(query.order);
	const statusRaw = getSingleQueryValue(query.status);
	const languageRaw = getSingleQueryValue(query.language);
	const cityRaw = getSingleQueryValue(query.city);
	const categoryRaw = getSingleQueryValue(query.category);

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

	const filters: TaskFilterParams = {};

	const statusValidation = parseStatusFilter(statusRaw);
	if (statusValidation.error || !statusValidation.validData) {
		return { error: statusValidation.error };
	}
	Object.assign(filters, statusValidation.validData);

	const languageValidation = parseLanguageFilter(languageRaw);
	if (languageValidation.error) {
		return { error: languageValidation.error };
	}
	Object.assign(filters, languageValidation.validData);

	const skillValidation = parseSkillFilter(query.skill);
	if (skillValidation.error) {
		return { error: skillValidation.error };
	}
	Object.assign(filters, skillValidation.validData);

	const cityValidation = parseCityFilter(cityRaw);
	if (cityValidation.error) {
		return { error: cityValidation.error };
	}
	Object.assign(filters, cityValidation.validData);

	//Category validation
	const categoryValidation = parseCategoryFilter(categoryRaw);
	if (categoryValidation.error) {
		return { error: categoryValidation.error };
	}
	Object.assign(filters, categoryValidation.validData);

	const distanceValidation = parseDistanceFilter(query);
	if (distanceValidation.error || !distanceValidation.validData) {
		return { error: distanceValidation.error };
	}
	Object.assign(filters, distanceValidation.validData);

	return {
		validData: {
			page,
			pageSize,
			sortBy: sortBy as TaskSortBy,
			order: order as SortOrder,
			filters,
		} satisfies ValidTasksQuery,
	};
};

/**
 * Validates query parameters for GET /offers endpoint
 * @param query - The query parameters from the request
 * @returns Object with either error message or validated data
 *
 */
export const validateOffersQuery = (
	query: Record<string, string | undefined>,
) => {
	//parse page parameter
	const page = query.page ? Number(query.page) : 1;
	const pageSize = query.pageSize ? Number(query.pageSize) : 10;

	//validate page
	if (!Number.isInteger(page) || page < 1) {
		return {
			error: "Error: 'page' trebuie sa fie minim 1",
		};
	}

	//validate pageSize
	if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) {
		return {
			error: "Error: 'pageSize' trebuie sa fie intre 1 si 50",
		};
	}
	//validate status filter
	let status: OfferStatus | undefined;
	if (query.status) {
		const statusUpper = query.status.toUpperCase() as string;
		const validStatuses: OfferStatus[] = ["PENDING", "ACCEPTED", "REJECTED"];

		if (!validStatuses.includes(statusUpper as OfferStatus)) {
			return {
				error: `Error: 'status' accepta doar: ${validStatuses.join(", ")}`,
			};
		}
		status = statusUpper as OfferStatus;
	}

	return {
		validData: {
			page,
			pageSize,
			status,
		} satisfies ValidOffersQuery,
	};
};
