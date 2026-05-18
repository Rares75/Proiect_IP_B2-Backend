import { describeRoute, resolver } from "hono-openapi";
import {
	profileDeleteResponseSchema,
	profileErrorResponseSchema,
	profileResponseSchema,
} from "../utils/validators/profile/schemas";

export const getProfileDocs = describeRoute({
	tags: ["User Profile"],
	responses: {
		200: {
			description: "Profile found",
			content: {
				"application/json": {
					schema: resolver(profileResponseSchema),
				},
			},
		},
		404: {
			description: "Profile not found",
			content: {
				"application/json": {
					schema: resolver(profileErrorResponseSchema),
				},
			},
		},
		500: {
			description: "Internal server error",
			content: {
				"application/json": {
					schema: resolver(profileErrorResponseSchema),
				},
			},
		},
	},
});

export const createProfileDocs = describeRoute({
	tags: ["User Profile"],
	responses: {
		201: {
			description: "Profile created successfully",
			content: {
				"application/json": {
					schema: resolver(profileResponseSchema),
				},
			},
		},
		400: {
			description: "Invalid input data",
			content: {
				"application/json": {
					schema: resolver(profileErrorResponseSchema),
				},
			},
		},
		401: {
			description: "Unauthorized - session missing",
			content: {
				"application/json": {
					schema: resolver(profileErrorResponseSchema),
				},
			},
		},
		404: {
			description: "User not found",
			content: {
				"application/json": {
					schema: resolver(profileErrorResponseSchema),
				},
			},
		},
		500: {
			description: "Internal server error",
			content: {
				"application/json": {
					schema: resolver(profileErrorResponseSchema),
				},
			},
		},
	},
});

export const updateProfileDocs = describeRoute({
	tags: ["User Profile"],
	responses: {
		200: {
			description: "Profile updated successfully",
			content: {
				"application/json": {
					schema: resolver(profileResponseSchema),
				},
			},
		},
		400: {
			description: "Invalid input data",
			content: {
				"application/json": {
					schema: resolver(profileErrorResponseSchema),
				},
			},
		},
		401: {
			description: "Unauthorized - session missing",
			content: {
				"application/json": {
					schema: resolver(profileErrorResponseSchema),
				},
			},
		},
		404: {
			description: "Profile not found",
			content: {
				"application/json": {
					schema: resolver(profileErrorResponseSchema),
				},
			},
		},
		500: {
			description: "Internal server error",
			content: {
				"application/json": {
					schema: resolver(profileErrorResponseSchema),
				},
			},
		},
	},
});

export const deleteProfileDocs = describeRoute({
	tags: ["User Profile"],
	responses: {
		200: {
			description: "Profile deleted successfully",
			content: {
				"application/json": {
					schema: resolver(profileDeleteResponseSchema),
				},
			},
		},
		401: {
			description: "Unauthorized - session missing",
			content: {
				"application/json": {
					schema: resolver(profileErrorResponseSchema),
				},
			},
		},
		404: {
			description: "Profile not found",
			content: {
				"application/json": {
					schema: resolver(profileErrorResponseSchema),
				},
			},
		},
		500: {
			description: "Internal server error",
			content: {
				"application/json": {
					schema: resolver(profileErrorResponseSchema),
				},
			},
		},
	},
});
