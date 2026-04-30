import { sql } from "drizzle-orm";
import { helpRequests } from "../db/requests";
import type { TaskFilterParams } from "./types";

type SkillQueryValue = string | string[] | undefined;

export const parseSkillFilter = (skill?: SkillQueryValue) => {
	if (skill === undefined) {
		return { validData: {} satisfies TaskFilterParams };
	}

	const rawSkills = Array.isArray(skill) ? skill : [skill];
	const skills = rawSkills.map((rawSkill) => rawSkill.trim());

	if (skills.some((rawSkill) => rawSkill.length === 0)) {
		return {
			error: "Error: 'skill' cannot be empty",
		};
	}

	return {
		validData: {
			skills,
		} satisfies TaskFilterParams,
	};
};

export const buildSkillFilter = ({ skills }: TaskFilterParams) => {
	if (!skills || skills.length === 0) {
		return undefined;
	}

	const normalizedSkills = skills.map((skill) => skill.trim().toLowerCase());

	return sql`exists (
		select 1
		from jsonb_array_elements_text(${helpRequests.skillsNeeded}) as skill(value)
		where lower(skill.value) in (${sql.join(
			normalizedSkills.map((skill) => sql`${skill}`),
			sql`, `,
		)})
	)`;
};
