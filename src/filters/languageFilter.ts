import { and, eq, isNull, or, sql } from "drizzle-orm";
import { requestDetails } from "../db/requests";
import type { TaskFilterParams } from "./types";

/**
 * Parse and validate the language
 * The string isn`t empty after Trim
 * Converted to lowercase
 * @param language
 */
const normalizeLanguage = (language: string) => language.trim().toLowerCase();

export const parseLanguageFilter = (language?: string) => {
	if (language === undefined) {
		return { validData: {} satisfies TaskFilterParams };
	}

	const normalized = normalizeLanguage(language);
	if (normalized.length === 0) {
		return {
			error: "Error: 'language' cannot be empty",
		};
	}

	if (normalized.length > 50) {
		return {
			error: "Error: 'language' must be at most 50 characters",
		};
	}
	/* Daca va trebui de flidat si formatul decomentati!
    if (!/^[a-zA-Z]{2,5}$/.test(normalized)) {
        return {
            error: "Error: Invalid 'language' format. Valid examples: RO, EN, FR",
        };
    }
     */

	return {
		validData: {
			language: normalized,
		} satisfies TaskFilterParams,
	};
};

export const buildLanguageFilter = ({ language }: TaskFilterParams) => {
	if (!language) {
		return undefined;
	}

	const normalized = normalizeLanguage(language);
	const directLanguageMatch = eq(
		sql`lower(${requestDetails.languageNeeded})`,
		normalized,
	);

	// Keep tasks without details/language requirement only when the requested language
	// exists in at least one explicit requestDetails record.
	const includeTasksWithoutLanguageRequirement = and(
		or(isNull(requestDetails.id), isNull(requestDetails.languageNeeded)),
		sql`exists (
            select 1
            from request_details rd
            where lower(rd.language_needed) = ${normalized}
        )`,
	);

	return or(directLanguageMatch, includeTasksWithoutLanguageRequirement);
};
