import { describeRoute, resolver } from "hono-openapi";
import {
	guestDeleteBadRequestSchema,
	guestDeleteConflictSchema,
	guestDeleteForbiddenSchema,
	guestDeleteNotFoundSchema,
	guestDeleteUnauthorizedSchema,
	guestTaskSuccessSchema,
} from "../utils/validators/guest/schemas";

export const tasksPostDocs = describeRoute({
	summary: "Creeaza un help request ca guest",
	description:
		"Permite utilizatorilor neautentificati sa creeze task-uri urgente (max 3 active).",
	tags: ["Guest Tasks"],
	responses: {
		201: {
			description: "Task creat cu succes",
			content: {
				"application/json": { schema: resolver(guestTaskSuccessSchema) },
			},
		},
		400: { description: "Validare esuata sau header malformat" },
		401: { description: "Lipseste header-ul X-Guest-Session" },
		429: { description: "Limita de 3 task-uri active a fost atinsa" },
	},
});

export const tasksGetDocs = describeRoute({
	summary: "Listeaza task-urile unui guest",
	description:
		"Returneaza task-urile create cu X-Guest-Session. Nu expune informatii despre voluntari sau assignment-uri.",
	tags: ["Guest Tasks"],
	responses: {
		200: { description: "Lista paginata de task-uri" },
		400: { description: "Query params invalizi sau header malformat" },
		401: { description: "Lipseste header-ul X-Guest-Session" },
	},
});

export const tasksGetByIdDocs = describeRoute({
	summary: "Get offers for a guest-owned task",
	description:
		"Retrieves a paginated list of offers for a task created by a guest. Only the guest who created the task (matching X-Guest-Session) can access this.",
	tags: ["Guest Tasks"],
	responses: {
		200: { description: "Successfully retrieved offers" },
		400: { description: "Invalid task id or query params" },
		401: { description: "Missing X-Guest-Session header" },
		403: { description: "X-Guest-Session does not match task owner" },
		404: { description: "Task not found" },
		500: { description: "Internal server error" },
	},
});

export const tasksDeleteSchema = describeRoute({
	summary: "Delete a guest-created task",
	description:
		"Deletes a help request created with X-Guest-Session. Only the creator (matching guestSessionId) can delete when status = OPEN.",
	tags: ["Guest Tasks"],
	responses: {
		204: {
			description: "Task deleted successfully",
		},
		400: {
			description: "Invalid task id or invalid X-Guest-Session format",
			content: {
				"application/json": {
					schema: resolver(guestDeleteBadRequestSchema),
				},
			},
		},
		401: {
			description: "Missing X-Guest-Session header",
			content: {
				"application/json": {
					schema: resolver(guestDeleteUnauthorizedSchema),
				},
			},
		},
		403: {
			description: "Session ID does not match task owner",
			content: {
				"application/json": {
					schema: resolver(guestDeleteForbiddenSchema),
				},
			},
		},
		404: {
			description: "Task not found",
			content: {
				"application/json": {
					schema: resolver(guestDeleteNotFoundSchema),
				},
			},
		},
		409: {
			description: "Task is not OPEN and cannot be deleted",
			content: {
				"application/json": {
					schema: resolver(guestDeleteConflictSchema),
				},
			},
		},
	},
});
