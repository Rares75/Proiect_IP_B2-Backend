import { describeRoute, resolver } from "hono-openapi";
import type { OpenAPIV3_1 } from "openapi-types";
import {
	currentVolunteerProfileResponseEnvelopeSchema,
	emptyVolunteerResponseEnvelopeSchema,
	volunteerResponseEnvelopeSchema,
} from "../utils/validators/volunteer/schemas";

const volunteerProfileRequestBody: OpenAPIV3_1.RequestBodyObject = {
	required: true,
	content: {
		"application/json": {
			schema: {
				type: "object",
				properties: {
					skills: {
						type: "array",
						items: {
							type: "string",
						},
					},
					maxDistanceKm: {
						oneOf: [{ type: "number", exclusiveMinimum: 0 }, { type: "null" }],
					},
					currentLocation: {
						oneOf: [
							{
								type: "object",
								required: ["x", "y"],
								properties: {
									x: { type: "number" },
									y: { type: "number" },
								},
							},
							{ type: "null" },
						],
					},
					knownLocations: {
						type: "array",
						items: {
							type: "object",
							required: ["location"],
							properties: {
								city: {
									oneOf: [{ type: "string" }, { type: "null" }],
								},
								addressText: {
									oneOf: [{ type: "string" }, { type: "null" }],
								},
								location: {
									type: "object",
									required: ["x", "y"],
									properties: {
										x: { type: "number" },
										y: { type: "number" },
									},
								},
							},
						},
					},
					availability: {
						type: "boolean",
					},
				},
			},
		},
	},
};

export const getVolunteerProfileDocs = describeRoute({
	summary: "Get volunteer profile",
	description:
		"Returns the full profile of a volunteer including personal data, skills, languages and rating information. Personal data (name, email, phone) is hidden if the volunteer has enabled hiddenIdentity.",
	tags: ["Volunteers"],
	parameters: [
		{
			name: "id",
			in: "path",
			required: true,
			description: "The numeric ID of the volunteer",
			schema: { type: "integer", example: 1 },
		},
	],
	responses: {
		200: {
			description: "Volunteer profile returned successfully",
			content: {
				"application/json": {
					schema: resolver(volunteerResponseEnvelopeSchema),
				},
			},
		},
		400: {
			description: "Invalid ID (not a positive integer)",
			content: {
				"application/json": {
					schema: resolver(emptyVolunteerResponseEnvelopeSchema),
				},
			},
		},
		404: {
			description: "Volunteer not found",
			content: {
				"application/json": {
					schema: resolver(emptyVolunteerResponseEnvelopeSchema),
				},
			},
		},
		500: {
			description: "Internal server error",
			content: {
				"application/json": {
					schema: resolver(emptyVolunteerResponseEnvelopeSchema),
				},
			},
		},
	},
});

export const getCurrentVolunteerProfileDocs = describeRoute({
	summary: "Get current volunteer profile",
	description:
		"Returns the authenticated volunteer record together with the editable volunteer profile settings, including maxDistanceKm, currentLocation and knownLocations.",
	tags: ["Volunteers"],
	responses: {
		200: {
			description: "Current volunteer profile returned successfully",
			content: {
				"application/json": {
					schema: resolver(currentVolunteerProfileResponseEnvelopeSchema),
				},
			},
		},
		401: {
			description: "Unauthorized",
			content: {
				"application/json": {
					schema: resolver(emptyVolunteerResponseEnvelopeSchema),
				},
			},
		},
		404: {
			description: "Volunteer not found",
			content: {
				"application/json": {
					schema: resolver(emptyVolunteerResponseEnvelopeSchema),
				},
			},
		},
		500: {
			description: "Internal server error",
			content: {
				"application/json": {
					schema: resolver(emptyVolunteerResponseEnvelopeSchema),
				},
			},
		},
	},
});

export const createCurrentVolunteerProfileDocs = describeRoute({
	summary: "Create current volunteer profile",
	description:
		"Creates the editable volunteer profile for the authenticated user. Supports skills, maxDistanceKm, currentLocation, knownLocations and availability.",
	tags: ["Volunteers"],
	requestBody: volunteerProfileRequestBody,
	responses: {
		201: {
			description: "Current volunteer profile created successfully",
			content: {
				"application/json": {
					schema: resolver(currentVolunteerProfileResponseEnvelopeSchema),
				},
			},
		},
		400: {
			description: "Invalid input or profile already exists",
			content: {
				"application/json": {
					schema: resolver(emptyVolunteerResponseEnvelopeSchema),
				},
			},
		},
		401: {
			description: "Unauthorized",
			content: {
				"application/json": {
					schema: resolver(emptyVolunteerResponseEnvelopeSchema),
				},
			},
		},
		500: {
			description: "Internal server error",
			content: {
				"application/json": {
					schema: resolver(emptyVolunteerResponseEnvelopeSchema),
				},
			},
		},
	},
});

export const updateCurrentVolunteerProfileDocs = describeRoute({
	summary: "Update current volunteer profile",
	description:
		"Updates the editable volunteer profile for the authenticated user. If knownLocations is provided, it replaces the full saved list.",
	tags: ["Volunteers"],
	requestBody: volunteerProfileRequestBody,
	responses: {
		200: {
			description: "Current volunteer profile updated successfully",
			content: {
				"application/json": {
					schema: resolver(currentVolunteerProfileResponseEnvelopeSchema),
				},
			},
		},
		400: {
			description: "Invalid input",
			content: {
				"application/json": {
					schema: resolver(emptyVolunteerResponseEnvelopeSchema),
				},
			},
		},
		401: {
			description: "Unauthorized",
			content: {
				"application/json": {
					schema: resolver(emptyVolunteerResponseEnvelopeSchema),
				},
			},
		},
		404: {
			description: "Volunteer or volunteer profile not found",
			content: {
				"application/json": {
					schema: resolver(emptyVolunteerResponseEnvelopeSchema),
				},
			},
		},
		500: {
			description: "Internal server error",
			content: {
				"application/json": {
					schema: resolver(emptyVolunteerResponseEnvelopeSchema),
				},
			},
		},
	},
});
