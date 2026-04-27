import type {TaskFilterParams} from "./types";

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
        return {validData: {} satisfies TaskFilterParams};
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
 * Calculate the match score between requested skills and task skills
 * @param requestedSkills The array of skills the user is filtering by (in future the volunteer skills)
 * @param taskSkills The array of skills required by the task
 * @returns The total number of matching skills
 */
export const calculateSkillMachScore = (
    requestedSkills: string[] | undefined,
    taskSkills: string[] | null | undefined,
): number => {
    // Return 0 if either array is empty or missing
    if (!requestedSkills || requestedSkills.length === 0) return 0;
    if (!taskSkills || taskSkills.length === 0) return 0;

    // Normalize task skills and put them in a Set
    const taskSkillsSet = new Set(taskSkills.map(normalizeSkill));

    const normalizedRequested = requestedSkills.map(normalizeSkill);

    let score = 0;
    for (const skill of normalizedRequested) {
        if (taskSkillsSet.has(skill)) {
            score++;
        }
    }

    return score;
};
