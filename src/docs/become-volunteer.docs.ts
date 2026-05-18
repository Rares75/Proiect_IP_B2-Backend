import { describeRoute, resolver } from "hono-openapi";
import {
	becomeVolunteerResponseSchema,
	becomeVolunteerErrorResponseSchema,
} from "../utils/validators/become-volunteer/schemas";

export const becomeVolunteerDocs = describeRoute({
	summary: "Become a volunteer",
	description:
		"Upgrades the authenticated user's role to volunteer. Creates a volunteer record and updates the user role. Returns 409 if the user is already a volunteer.",
	tags: ["Users"],
	responses: {
		201: {
			description: "User successfully became a volunteer",
			content: {
				"application/json": {
					schema: resolver(becomeVolunteerResponseSchema),
				},
			},
		},
		401: {
			description: "Unauthorized - session missing",
			content: {
				"application/json": {
					schema: resolver(becomeVolunteerErrorResponseSchema),
				},
			},
		},
		404: {
			description: "User not found",
			content: {
				"application/json": {
					schema: resolver(becomeVolunteerErrorResponseSchema),
				},
			},
		},
		409: {
			description: "User is already a volunteer",
			content: {
				"application/json": {
					schema: resolver(becomeVolunteerErrorResponseSchema),
				},
			},
		},
		500: {
			description: "Internal server error",
			content: {
				"application/json": {
					schema: resolver(becomeVolunteerErrorResponseSchema),
				},
			},
		},
	},
});
