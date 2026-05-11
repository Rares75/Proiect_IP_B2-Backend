import { eq } from "drizzle-orm";
import { helpRequests } from "../db/requests";
import type { TaskFilterParams } from "./types";

export const parseCategoryFilter = (categoryRaw: string | undefined) => {
	if (!categoryRaw) return { validData: {} };

	const categoryUpper = categoryRaw.toUpperCase();
	const validCategories = ["FACE_TO_FACE", "MESSAGES_ONLY"];

	if (!validCategories.includes(categoryUpper)) {
		return {
			error: `Eroare: 'category' accepta doar: ${validCategories.join(", ")}.`,
		};
	}

	return {
		validData: { category: categoryUpper as "FACE_TO_FACE" | "MESSAGES_ONLY" },
	};
};

export const buildCategoryFilter = (filters: TaskFilterParams) => {
	if (!filters.category) return undefined;
	return eq(helpRequests.category, filters.category);
};
