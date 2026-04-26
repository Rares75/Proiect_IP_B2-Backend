import { sql, type SQL } from "drizzle-orm";
import { helpRequests } from "../db/schema";
import type { TaskFilterParams } from "./types";

const normalizeSkill = (value: string) => value.trim().toLowerCase();

const toSkillArray = (skill?: string | string[]) =>
	skill === undefined ? undefined : Array.isArray(skill) ? skill : [skill];

/**
 * Parse, normalize, and validate the skills filter
 * @param {string | string[]} [skill] - the raw value(s) received from the query parameters
 * Can be a single string or an array of strings
 * @returns {{ validData: TaskFilterParams } | { error: string }}
 * Returns an object containing `validData` with the array of unique and normalized skills,
 *  or an `error` object with an explanatory message if validation fails
 */
export const parseSkillFilter = (skill?: string | string[]) => {
	const rawValues = toSkillArray(skill);
	if (rawValues === undefined || rawValues.length === 0) {
		return { validData: {} satisfies TaskFilterParams };
	}

	if (rawValues.some((value) => value.trim().length === 0)) {
		return {
			error: "Error: 'skill' cannot be empty",
		};
	}

	return {
		validData: {
			skills: [...new Set(rawValues.map(normalizeSkill))],
		} satisfies TaskFilterParams,
	};
};

/**
 *  Builds an SQL expression that evaluates whether a specific skill
 * @param normalizedSkill  The skill being searched for, normalized to lowercase and trimmed
 * @returns {SQL<number>} An SQL expression that returns 1 if the skill exists in the task, or 0 if it does not
 */
const buildSingleSkillScoreExpr = (normalizedSkill: string): SQL<number> => {
	let expr: SQL<number>;
	expr = sql`
        case when exists ( select 1 from jsonb_array_elements_text( coalesce(
        ${helpRequests.skillsNeeded},
        '[]'
        :
        :
        jsonb
        )
        )
        as
        skill_item
        (
        value
        )
        where
        lower
        (
        skill_item
        .
        value
        )
        =
        ${normalizedSkill}
        )
        then
        1
        else
        0
        end
    `;

	return expr;
};

export const buildSkillMatchScore = ({
	skills,
}: TaskFilterParams): SQL<number> => {
	if (!skills || skills.length === 0) {
		return sql<number>`0`;
	}

	const expressions = [...new Set(skills.map(normalizeSkill))].map(
		buildSingleSkillScoreExpr,
	);

	return expressions.slice(1).reduce(
		(acc, expr) => sql<number>`${acc}
        +
        ${expr}`,
		expressions[0],
	);
};
