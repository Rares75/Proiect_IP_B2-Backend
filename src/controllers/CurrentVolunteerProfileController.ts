import { Hono } from "hono";
import { describeRoute, resolver } from "hono-openapi";
import type { OpenAPIV3_1 } from "openapi-types";
import { z } from "zod";
import { Controller } from "../utils/controller";
import { inject } from "../di";
import { VolunteerRepository } from "../db/repositories/volunteer.repository";
import { authMiddlware } from "../middlware/authMiddleware";
import { sendApiResponse } from "../utils/apiReponse";
import { logger } from "../utils/logger";

const pointSchema = z.object({
	x: z.number(),
	y: z.number(),
});

const knownLocationSchema = z.object({
	id: z.number().int().positive().optional(),
	city: z.string().nullable().optional(),
	addressText: z.string().nullable().optional(),
	location: pointSchema,
});

const currentVolunteerProfileSchema = z.object({
	volunteerId: z.number().int().positive(),
	maxDistanceKm: z.number().nullable(),
	currentLocation: pointSchema.nullable(),
	knownLocations: z.array(knownLocationSchema),
});

const updateCurrentVolunteerProfileSchema = z.object({
	maxDistanceKm: z.number().nonnegative().nullable(),
	currentLocation: pointSchema.nullable(),
	knownLocations: z.array(
		z.object({
			city: z.string().nullable().optional(),
			addressText: z.string().nullable().optional(),
			location: pointSchema,
		}),
	),
});

const apiEnvelopeSchema = z.object({
	data: currentVolunteerProfileSchema.nullable(),
	message: z.string(),
	notFound: z.boolean(),
	isUnauthorized: z.boolean(),
	isServerError: z.boolean(),
	isForbidden: z.boolean(),
	isClientError: z.boolean(),
	app: z.object({
		url: z.string(),
	}),
	statusCode: z.number().int(),
});

const updateCurrentVolunteerProfileRequestBody: OpenAPIV3_1.RequestBodyObject =
	{
		required: true,
		content: {
			"application/json": {
				schema: {
					type: "object",
					required: ["maxDistanceKm", "currentLocation", "knownLocations"],
					properties: {
						maxDistanceKm: {
							oneOf: [{ type: "number", minimum: 0 }, { type: "null" }],
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
					},
				},
			},
		},
	};

@Controller("/users")
export class CurrentVolunteerProfileController {
	constructor(
		@inject(VolunteerRepository)
		private readonly volunteerRepository: VolunteerRepository,
	) {}

	controller = new Hono()
		.use(authMiddlware)
		.get(
			"/me/volunteer-profile",
			describeRoute({
				summary: "Get current volunteer profile settings",
				description:
					"Returns the authenticated volunteer's distance settings and saved locations.",
				tags: ["Users", "Volunteers"],
				responses: {
					200: {
						description: "Volunteer profile settings returned successfully",
						content: {
							"application/json": {
								schema: resolver(apiEnvelopeSchema),
							},
						},
					},
					401: {
						description: "Unauthorized",
					},
					404: {
						description: "Volunteer profile not found",
					},
					500: {
						description: "Internal server error",
					},
				},
			}),
			async (c) => {
				const session = c.get("session");
				if (!session) {
					return sendApiResponse(c, null, { kind: "unauthorized" });
				}

				try {
					const profile =
						await this.volunteerRepository.findCurrentProfileByUserId(
							session.userId,
						);

					if (!profile) {
						return sendApiResponse(c, null, { kind: "notFound" });
					}

					return sendApiResponse(c, profile);
				} catch (error) {
					logger.exception(error);
					return sendApiResponse(c, null, { kind: "serverError" });
				}
			},
		)
		.put(
			"/me/volunteer-profile",
			describeRoute({
				summary: "Save current volunteer profile settings",
				description:
					"Saves the authenticated volunteer's max distance, current location and known locations.",
				tags: ["Users", "Volunteers"],
				requestBody: updateCurrentVolunteerProfileRequestBody,
				responses: {
					200: {
						description: "Volunteer profile settings saved successfully",
						content: {
							"application/json": {
								schema: resolver(apiEnvelopeSchema),
							},
						},
					},
					400: {
						description: "Invalid request body",
					},
					401: {
						description: "Unauthorized",
					},
					404: {
						description: "Volunteer profile not found",
					},
					500: {
						description: "Internal server error",
					},
				},
			}),
			async (c) => {
				const session = c.get("session");
				if (!session) {
					return sendApiResponse(c, null, { kind: "unauthorized" });
				}

				try {
					const body = await c.req.json();
					const parsed = updateCurrentVolunteerProfileSchema.safeParse(body);

					if (!parsed.success) {
						return sendApiResponse(c, null, {
							kind: "clientError",
							message: "Failed to validate input",
						});
					}

					const profile =
						await this.volunteerRepository.saveCurrentProfileByUserId(
							session.userId,
							parsed.data,
						);

					if (!profile) {
						return sendApiResponse(c, null, { kind: "notFound" });
					}

					return sendApiResponse(c, profile);
				} catch (error) {
					logger.exception(error);
					return sendApiResponse(c, null, { kind: "serverError" });
				}
			},
		);
}
