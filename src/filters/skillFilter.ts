import { sql } from "drizzle-orm";
import { helpRequests } from "../db/requests";
import type { TaskFilterParams } from "./types";

type SkillQueryValue = string | string[] | undefined;

const normalizeSkill = (value: string) => value.trim().toLowerCase();

const toSkillArray = (skill?: SkillQueryValue) =>
	skill === undefined ? undefined : Array.isArray(skill) ? skill : [skill];

export const parseSkillFilter = (skill?: SkillQueryValue) => {
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

export const buildSkillFilter = ({ skills }: TaskFilterParams) => {
	if (!skills || skills.length === 0) {
		return undefined;
	}

	const normalizedSkills = skills.map(normalizeSkill);

	return sql`exists (
		select 1
		from jsonb_array_elements_text(${helpRequests.skillsNeeded}) as skill(value)
		where lower(skill.value) in (${sql.join(
			normalizedSkills.map((skill) => sql`${skill}`),
			sql`, `,
		)})
	)`;
};

export const calculateSkillMachScore = (
	requestedSkills: string[] | undefined,
	taskSkills: string[] | null | undefined,
): number => {
	if (!requestedSkills || requestedSkills.length === 0) return 0;
	if (!taskSkills || taskSkills.length === 0) return 0;

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
