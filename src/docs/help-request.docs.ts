import { describeRoute, resolver } from "hono-openapi";
import type { OpenAPIV3_1 } from "openapi-types";
import { helpRequestCategoryEnum, requestStatusEnum } from "../db/enums";
import {
	emptyTaskApiResponseSchema,
	helpRequestCreateBodySchema,
	moderationResponseSchema,
	successTaskDetailsSchema,
} from "../utils/validators/tasks/schemas";
import { z } from "zod";

const taskIdPathParameter: OpenAPIV3_1.ParameterObject = {
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

const taskListParameters: OpenAPIV3_1.ParameterObject[] = [
	{
		name: "page",
		in: "query",
		required: false,
		description: "Page number, starting from 1",
		schema: { type: "integer", minimum: 1, default: 1 },
	},
	{
		name: "pageSize",
		in: "query",
		required: false,
		description: "Number of tasks to return per page",
		schema: { type: "integer", minimum: 1, maximum: 100, default: 10 },
	},
	{
		name: "sortBy",
		in: "query",
		required: false,
		description: "Field used for sorting",
		schema: {
			type: "string",
			enum: ["createdAt", "urgency"],
			default: "createdAt",
		},
	},
	{
		name: "order",
		in: "query",
		required: false,
		description: "Sort order",
		schema: { type: "string", enum: ["ASC", "DESC"], default: "DESC" },
	},
	{
		name: "status",
		in: "query",
		required: false,
		description: "Filter tasks by request status",
		schema: { type: "string", enum: [...requestStatusEnum.enumValues] },
	},
	{
		name: "category",
		in: "query",
		required: false,
		description: "Filter tasks by category",
		schema: { type: "string", enum: [...helpRequestCategoryEnum.enumValues] },
	},
	{
		name: "city",
		in: "query",
		required: false,
		description: "Filter tasks by city",
		schema: { type: "string" },
	},
	{
		name: "language",
		in: "query",
		required: false,
		description: "Filter tasks by required language",
		schema: { type: "string", maxLength: 50 },
	},
	{
		name: "skill",
		in: "query",
		required: false,
		description:
			"Filter tasks by skill. The parameter may be repeated multiple times.",
		schema: {
			type: "array",
			items: { type: "string" },
		},
		style: "form",
		explode: true,
	},
	{
		name: "lat",
		in: "query",
		required: false,
		description:
			"Latitude used together with lng and radius for distance filtering",
		schema: { type: "number", minimum: -90, maximum: 90 },
	},
	{
		name: "lng",
		in: "query",
		required: false,
		description:
			"Longitude used together with lat and radius for distance filtering",
		schema: { type: "number", minimum: -180, maximum: 180 },
	},
	{
		name: "radius",
		in: "query",
		required: false,
		description: "Radius in kilometers for distance filtering",
		schema: { type: "number", exclusiveMinimum: 0 },
	},
];

const taskMessagesParameters: OpenAPIV3_1.ParameterObject[] = [
	taskIdPathParameter,
	{
		name: "page",
		in: "query",
		required: false,
		description: "Page number, starting from 1",
		schema: { type: "integer", minimum: 1, default: 1 },
	},
	{
		name: "pageSize",
		in: "query",
		required: false,
		description: "Number of messages returned per page",
		schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
	},
	{
		name: "X-Guest-Session",
		in: "header",
		required: false,
		description:
			"Guest session identifier used when the requester is not authenticated",
		schema: { type: "string" },
	},
];

const taskOffersParameters: OpenAPIV3_1.ParameterObject[] = [
	taskIdPathParameter,
	{
		name: "page",
		in: "query",
		required: false,
		description: "Page number, starting from 1",
		schema: { type: "integer", minimum: 1, default: 1 },
	},
	{
		name: "pageSize",
		in: "query",
		required: false,
		description: "Number of offers returned per page",
		schema: { type: "integer", minimum: 1, maximum: 50, default: 10 },
	},
	{
		name: "status",
		in: "query",
		required: false,
		description: "Filter offers by status",
		schema: { type: "string", enum: ["PENDING", "ACCEPTED", "REJECTED"] },
	},
];

const helpRequestCreateRequestBody: OpenAPIV3_1.RequestBodyObject = {
	required: true,
	content: {
		"application/json": {
			schema: helpRequestCreateBodySchema,
		},
	},
};

const taskStatusUpdateRequestBody: OpenAPIV3_1.RequestBodyObject = {
	required: true,
	content: {
		"application/json": {
			schema: {
				type: "object",
				required: ["status"],
				properties: {
					status: {
						type: "string",
						enum: [...requestStatusEnum.enumValues],
						description: "New task status",
					},
				},
			},
		},
	},
};

const helpOfferCreateRequestBody: OpenAPIV3_1.RequestBodyObject = {
	required: true,
	content: {
		"application/json": {
			schema: {
				type: "object",
				properties: {
					message: {
						type: "string",
						maxLength: 500,
						description:
							"Optional message sent by the volunteer together with the offer",
					},
				},
				additionalProperties: false,
			},
		},
	},
};

export const createTaskDocs = describeRoute({
	summary: "Create a new task",
	description:
		"Creates a new help request/task. Optionally associates it with the authenticated user.",
	tags: ["Tasks"],
	requestBody: helpRequestCreateRequestBody,
	responses: {
		201: {
			description: "The task was successfully created",
			content: {
				"application/json": { schema: resolver(successTaskDetailsSchema) },
			},
		},
		400: {
			description: "Invalid input or moderation error (inappropriate content)",
			content: {
				"application/json": {
					schema: resolver(
						z.union([emptyTaskApiResponseSchema, moderationResponseSchema]),
					),
				},
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

export const getPaginatedTasksDocs = describeRoute({
	summary: "Get paginated tasks",
	description:
		"Retrieve a paginated, sorted, and filtered list of tasks. Requires authentication.",
	tags: ["Tasks"],
	parameters: taskListParameters,
	responses: {
		200: {
			description: "Successfully retrieved tasks",
			content: {
				"application/json": { schema: resolver(successTaskDetailsSchema) },
			},
		},
		400: {
			description: "Validation error in query parameters",
			content: {
				"application/json": { schema: resolver(emptyTaskApiResponseSchema) },
			},
		},
		401: {
			description: "Unauthorized",
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

export const getTaskMessagesDocs = describeRoute({
	summary: "Get task conversation messages",
	description:
		"Retrieves paginated messages for the conversation associated with a task. Accepts either an authenticated owner/assigned volunteer or a matching X-Guest-Session header.",
	tags: ["Tasks"],
	parameters: taskMessagesParameters,
	responses: {
		200: { description: "Successfully retrieved conversation messages" },
		400: { description: "Invalid task ID or pagination parameters" },
		401: {
			description:
				"Unauthorized - neither an auth session nor X-Guest-Session was provided",
		},
		403: {
			description:
				"Forbidden - auth user or guest session does not match the task",
		},
		404: { description: "Conversation not found" },
		500: { description: "Internal server error" },
	},
});

export const getTaskByIdDocs = describeRoute({
	summary: "Get task by ID",
	description:
		"Retrieves a specific task by its ID. Applies anonymous mode sanitization if needed.",
	tags: ["Tasks"],
	parameters: [taskIdPathParameter],
	responses: {
		200: {
			description: "Successfully retrieved the task",
			content: {
				"application/json": { schema: resolver(successTaskDetailsSchema) },
			},
		},
		400: {
			description: "Invalid ID provided",
			content: {
				"application/json": { schema: resolver(emptyTaskApiResponseSchema) },
			},
		},
		404: {
			description: "Task not found",
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

export const updateTaskStatusDocs = describeRoute({
	summary: "Update task status",
	description:
		"Changes the status of a specific task. Validates permissions and correct status transitions.",
	tags: ["Tasks"],
	parameters: [taskIdPathParameter],
	requestBody: taskStatusUpdateRequestBody,
	responses: {
		200: {
			description: "Status updated successfully",
			content: {
				"application/json": { schema: resolver(successTaskDetailsSchema) },
			},
		},
		400: {
			description: "Invalid request ID, invalid JSON, or invalid status value",
			content: {
				"application/json": { schema: resolver(emptyTaskApiResponseSchema) },
			},
		},
		403: {
			description:
				"Forbidden. User does not have permission to update this task",
			content: {
				"application/json": { schema: resolver(emptyTaskApiResponseSchema) },
			},
		},
		404: {
			description: "Task not found",
			content: {
				"application/json": { schema: resolver(emptyTaskApiResponseSchema) },
			},
		},
		409: {
			description: "Invalid status transition (Conflict)",
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

export const deleteTaskDocs = describeRoute({
	summary: "Delete a task",
	description:
		"Deletes a task owned by the authenticated user. Only tasks with OPEN or CANCELLED status can be deleted. All pending offers are automatically rejected, and volunteers are notified.",
	tags: ["Tasks"],
	parameters: [taskIdPathParameter],
	responses: {
		204: { description: "Task successfully deleted" },
		400: {
			description: "Invalid task ID provided",
			content: {
				"application/json": { schema: resolver(emptyTaskApiResponseSchema) },
			},
		},
		401: {
			description: "Unauthorized - User is not authenticated",
			content: {
				"application/json": { schema: resolver(emptyTaskApiResponseSchema) },
			},
		},
		403: {
			description: "Forbidden - User is not the task owner",
			content: {
				"application/json": { schema: resolver(emptyTaskApiResponseSchema) },
			},
		},
		404: {
			description: "Task not found",
			content: {
				"application/json": { schema: resolver(emptyTaskApiResponseSchema) },
			},
		},
		409: {
			description:
				"Conflict - Task cannot be deleted due to invalid status (MATCHED, IN_PROGRESS, COMPLETED, or REJECTED)",
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

export const getTaskOffersDocs = describeRoute({
	summary: "Get offers for a specific task",
	description:
		"Retrieves a paginated list of offers for a task. Only the task owner can access this information.",
	tags: ["Tasks"],
	parameters: taskOffersParameters,
	responses: {
		200: {
			description: "Successfully retrieved offers",
			content: {
				"application/json": { schema: resolver(successTaskDetailsSchema) },
			},
		},
		400: {
			description: "Invalid task ID, pagination parameters, or status filter",
			content: {
				"application/json": { schema: resolver(emptyTaskApiResponseSchema) },
			},
		},
		401: {
			description: "Unauthorized - User is not authenticated",
			content: {
				"application/json": { schema: resolver(emptyTaskApiResponseSchema) },
			},
		},
		403: {
			description: "Forbidden - User is not the owner of this task",
			content: {
				"application/json": { schema: resolver(emptyTaskApiResponseSchema) },
			},
		},
		404: {
			description: "Task not found",
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

export const createTaskOfferDocs = describeRoute({
	summary: "Create a task offer",
	description:
		"Creates a volunteer offer for a task. This endpoint is currently kept in HelpRequestController for routing consistency.",
	tags: ["Tasks"],
	parameters: [taskIdPathParameter],
	requestBody: helpOfferCreateRequestBody,
	responses: {
		201: {
			description: "The offer was successfully created",
			content: {
				"application/json": { schema: resolver(successTaskDetailsSchema) },
			},
		},
		401: {
			description: "Unauthorized",
			content: {
				"application/json": { schema: resolver(emptyTaskApiResponseSchema) },
			},
		},
		400: {
			description: "Invalid task id or invalid request body",
			content: {
				"application/json": { schema: resolver(emptyTaskApiResponseSchema) },
			},
		},
		403: {
			description: "Forbidden. The session user cannot submit this offer",
			content: {
				"application/json": { schema: resolver(emptyTaskApiResponseSchema) },
			},
		},
		404: {
			description: "Task not found",
			content: {
				"application/json": { schema: resolver(emptyTaskApiResponseSchema) },
			},
		},
		409: {
			description: "Task status conflict or duplicate pending offer",
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
