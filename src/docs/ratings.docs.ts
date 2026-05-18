import { describeRoute, resolver } from "hono-openapi";
import {
	ratingErrorResponseEnvelopeSchema,
	ratingResponseEnvelopeSchema,
	ratingsListResponseEnvelopeSchema,
	ratingSummaryResponseEnvelopeSchema,
} from "../utils/validators/ratings/schemas";

export const createRatingDocs = describeRoute({
	tags: ["Ratings"],
	summary: "Create a new rating",
	description: `
Create a rating for a user after completing a task.
Only task participants (requester or volunteer) can rate each other.
Ratings can only be created for completed task assignments.
		`,
	requestBody: {
		content: {
			"application/json": {
				schema: {
					type: "object",
					required: [
						"taskAssignmentId",
						"writtenByUserId",
						"receivedByUserId",
						"stars",
						"comment",
					],
					properties: {
						taskAssignmentId: {
							type: "integer",
							description: "ID of the completed task assignment",
							example: 1,
						},
						writtenByUserId: {
							type: "string",
							description: "ID of the user giving the rating",
							example: "user123",
						},
						receivedByUserId: {
							type: "string",
							description: "ID of the user receiving the rating",
							example: "user456",
						},
						stars: {
							type: "integer",
							minimum: 1,
							maximum: 5,
							description: "Star rating from 1 to 5",
							example: 5,
						},
						comment: {
							type: "string",
							minLength: 1,
							description: "Feedback comment for the rating",
							example: "Great volunteer, very professional and helpful",
						},
					},
				},
			},
		},
	},
	responses: {
		201: {
			description: "Rating created successfully",
			content: {
				"application/json": {
					schema: resolver(ratingResponseEnvelopeSchema),
				},
			},
		},
		400: {
			description: "Validation error or business rule violation",
			content: {
				"application/json": {
					schema: resolver(ratingErrorResponseEnvelopeSchema),
				},
			},
		},
		500: {
			description: "Server error",
			content: {
				"application/json": {
					schema: resolver(ratingErrorResponseEnvelopeSchema),
				},
			},
		},
	},
});

export const getUserRatingsDocs = describeRoute({
	tags: ["Ratings"],
	summary: "Get all ratings for a user",
	description: `
Retrieve all ratings that a user has received.
This includes ratings from both requesters and volunteers.
		`,
	parameters: [
		{
			name: "userId",
			in: "path",
			required: true,
			description: "ID of the user to get ratings for",
			schema: {
				type: "string",
				example: "user456",
			},
		},
	],
	responses: {
		200: {
			description: "List of ratings for the user",
			content: {
				"application/json": {
					schema: resolver(ratingsListResponseEnvelopeSchema),
				},
			},
		},
		400: {
			description: "Invalid user ID",
		},
		500: {
			description: "Server error",
		},
	},
});

export const getUserRatingsSummaryDocs = describeRoute({
	tags: ["Ratings"],
	summary: "Get rating summary for a user",
	description: `
Get aggregated rating statistics for a user including:
- Average rating score
- Total number of ratings received
		`,
	parameters: [
		{
			name: "userId",
			in: "path",
			required: true,
			description: "ID of the user to get rating summary for",
			schema: {
				type: "string",
				example: "user456",
			},
		},
	],
	responses: {
		200: {
			description: "Rating summary for the user",
			content: {
				"application/json": {
					schema: resolver(ratingSummaryResponseEnvelopeSchema),
				},
			},
		},
		400: {
			description: "Invalid user ID",
		},
		500: {
			description: "Server error",
		},
	},
});
