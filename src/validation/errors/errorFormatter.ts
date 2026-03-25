import type { ZodIssue } from "zod";

import type {
	ValidationErrorFormatter,
	ValidationErrorItem,
} from "../types/validation.types";

const fallbackField = "body";

const normalizeField = (issue: ZodIssue): string => {
	if (issue.path.length === 0) {
		return fallbackField;
	}

	return issue.path.map(String).join(".");
};

const normalizeMessage = (issue: ZodIssue): string => issue.message;

export const formatValidationIssues: ValidationErrorFormatter = (
	issues,
): ValidationErrorItem[] =>
	issues.map((issue) => ({
		field: normalizeField(issue),
		message: normalizeMessage(issue),
	}));
