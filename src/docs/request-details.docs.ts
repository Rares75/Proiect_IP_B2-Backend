import { describeRoute, resolver } from "hono-openapi";
import type { OpenAPIV3_1 } from "openapi-types";
import {
	emptyTaskApiResponseSchema,
	successTaskDetailsSchema,
	taskValidationErrorSchema,
} from "../utils/validators/tasks/schemas";

const taskDetailsRequestBody: OpenAPIV3_1.RequestBodyObject = {
	required: true,
	content: {
		"application/json": {
			schema: {
				type: "object",
				required: ["notes", "languageNeeded", "safetyNotes"],
				properties: {
					notes: {
						type: "string",
						minLength: 1,
					},
					languageNeeded: {
						type: "string",
						minLength: 1,
						maxLength: 50,
					},
					safetyNotes: {
						type: "string",
						minLength: 1,
					},
				},
				additionalProperties: false,
			},
		},
	},
};

const taskIdDetailsParameter: OpenAPIV3_1.ParameterObject = {
	name: "id",
	in: "path",
	required: true,
	description: "The numeric identifier of the task",
	schema: {
		type: "integer",
		minimum: 1,
		example: 12,
	},
};

export const updateTaskDetailsDocs = describeRoute({
	summary: "Update/Add task details",
	description:
		"Performs an upsert for the details of an existing task. Requires authorization and an OPEN status.",
	tags: ["Tasks"],
	parameters: [taskIdDetailsParameter],
	requestBody: taskDetailsRequestBody,
	responses: {
		200: {
			description: "The details have been successfully updated",
			content: {
				"application/json": { schema: resolver(successTaskDetailsSchema) },
			},
		},
		400: {
			description: "Invalid data in the request body or invalid ID",
			content: {
				"application/json": { schema: resolver(taskValidationErrorSchema) },
			},
		},
		403: {
			description: "Access denied for this user",
			content: {
				"application/json": { schema: resolver(emptyTaskApiResponseSchema) },
			},
		},
		404: {
			description: "The task was not found",
			content: {
				"application/json": { schema: resolver(emptyTaskApiResponseSchema) },
			},
		},
		409: {
			description: "Conflict: Details can only be edited when the status is OPEN",
			content: {
				"application/json": { schema: resolver(emptyTaskApiResponseSchema) },
			},
		},
		500: {
			description: "Internal server error",
			content: {
				"application/json": { schema: resolver(emptyTaskApiResponseSchema) },
			},
		},
	},
});

export const deleteTaskDetailsDocs = describeRoute({
	summary: "Delete task details",
	description:
		"Deletes the details of an existing task. Requires authorization and the task status must be OPEN.",
	tags: ["Tasks"],
	parameters: [taskIdDetailsParameter],
	responses: {
		204: {
			description: "The details have been successfully deleted (No Content)",
		},
		400: {
			description: "Invalid request ID",
			content: {
				"application/json": { schema: resolver(emptyTaskApiResponseSchema) },
			},
		},
		403: {
			description: "Access denied for this user",
			content: {
				"application/json": { schema: resolver(emptyTaskApiResponseSchema) },
			},
		},
		404: {
			description: "The task was not found",
			content: {
				"application/json": { schema: resolver(emptyTaskApiResponseSchema) },
			},
		},
		409: {
			description:
				"Conflict: Details cannot be deleted when task status is MATCHED, IN_PROGRESS, COMPLETED, CANCELLED or REJECTED.",
			content: {
				"application/json": { schema: resolver(emptyTaskApiResponseSchema) },
			},
		},
	},
});
