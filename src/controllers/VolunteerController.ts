import { Hono } from "hono";
import { describeRoute, resolver } from "hono-openapi";
import type { OpenAPIV3_1 } from "openapi-types";
import { z } from "zod";
import { Controller } from "../utils/controller";
import { inject } from "../di";
import { VolunteerRepository } from "../db/repositories/volunteer.repository";
import auth from "../auth";
import { mapUserIdentity } from "../utils/identityMapper";
import { VolunteerService } from "../services/VolunteerService";
import { authMiddlware } from "../middlware/authMiddleware";
import { sendApiResponse } from "../utils/apiReponse";
import { NotFoundError } from "../utils/Errors";
import { logger } from "../utils/logger";

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const ratingItemSchema = z
	.object({
		id: z.number().int().positive(),
		stars: z.number().int().min(1).max(5),
		comment: z.string().nullable(),
		createdAt: z.string().datetime(),
		writtenByUserId: z.string(),
	})
	.meta({ ref: "RatingItem" });

const volunteerUserSchema = z
	.object({
		id: z.string(),
		name: z.string().nullable(),
		email: z.string().nullable(),
		phone: z.string().nullable(),
		image: z.string().nullable(),
		alias: z.string(),
		isIdentityHidden: z.boolean(),
	})
	.meta({ ref: "VolunteerUser" });

const volunteerProfileSchema = z
	.object({
		bio: z.string().nullable(),
		languages: z.array(z.string()),
		skills: z.array(z.string()),
		maxDistanceKm: z.number().nullable(),
		currentLocation: z
			.object({
				x: z.number(),
				y: z.number(),
			})
			.nullable()
			.optional(),
		knownLocations: z
			.array(
				z.object({
					id: z.number().int().positive(),
					city: z.string().nullable(),
					addressText: z.string().nullable(),
					location: z.object({
						x: z.number(),
						y: z.number(),
					}),
				}),
			)
			.optional(),
	})
	.meta({ ref: "VolunteerProfile" });

const volunteerLocationSchema = z.object({
	x: z.number(),
	y: z.number(),
});

const knownLocationInputSchema = z.object({
	city: z.string().nullable().optional(),
	addressText: z.string().nullable().optional(),
	location: volunteerLocationSchema,
});

const volunteerProfileInputSchema = z
	.object({
		skills: z.array(z.string()).optional(),
		maxDistanceKm: z.number().positive().nullable().optional(),
		currentLocation: volunteerLocationSchema.nullable().optional(),
		knownLocations: z.array(knownLocationInputSchema).optional(),
		availability: z.boolean().optional(),
	})
	.meta({ ref: "VolunteerProfileInput" });

const skillInputSchema = z
	.object({
		skill: z.string().min(1),
	})
	.meta({ ref: "SkillInput" });

const ratingInfoSchema = z
	.object({
		averageStars: z.number().nullable(),
		totalRatings: z.number().int(),
		ratings: z.array(ratingItemSchema),
	})
	.meta({ ref: "VolunteerRatingInfo" });

const volunteerResponseSchema = z
	.object({
		id: z.number().int().positive(),
		availability: z.boolean(),
		trustScore: z.number(),
		completedTasks: z.number().int(),
		user: volunteerUserSchema,
		profile: volunteerProfileSchema,
		ratingInfo: ratingInfoSchema,
	})
	.meta({
		ref: "VolunteerResponse",
	});

const currentVolunteerSchema = z
	.object({
		id: z.number().int().positive(),
		userId: z.string(),
		availability: z.boolean(),
		trustScore: z.number(),
		completedTasks: z.number().int(),
		createdAt: z.union([z.string().datetime(), z.date()]).optional(),
		updatedAt: z.union([z.string().datetime(), z.date()]).optional(),
	})
	.meta({ ref: "CurrentVolunteer" });

const currentVolunteerProfileResponseSchema = z
	.object({
		volunteer: currentVolunteerSchema,
		profile: volunteerProfileSchema
			.extend({
				id: z.number().int().positive(),
				volunteerId: z.number().int().positive(),
			})
			.nullable(),
	})
	.meta({ ref: "CurrentVolunteerProfileResponse" });

const apiEnvelopeSchema = z.object({
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

const volunteerResponseEnvelopeSchema = apiEnvelopeSchema
	.extend({
		data: volunteerResponseSchema,
	})
	.meta({ ref: "VolunteerResponseEnvelope" });

const currentVolunteerProfileResponseEnvelopeSchema = apiEnvelopeSchema
	.extend({
		data: currentVolunteerProfileResponseSchema,
	})
	.meta({ ref: "CurrentVolunteerProfileResponseEnvelope" });

const emptyResponseEnvelopeSchema = apiEnvelopeSchema
	.extend({
		data: z.null(),
	})
	.meta({ ref: "VolunteerEmptyResponseEnvelope" });

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

const parseVolunteerId = (idParam: string): number | null => {
	const volunteerId = Number(idParam);

	if (
		!/^\d+$/.test(idParam) ||
		volunteerId <= 0 ||
		volunteerId > Number.MAX_SAFE_INTEGER
	) {
		return null;
	}

	return volunteerId;
};

const buildCurrentVolunteerProfileResponse = (
	result: Awaited<ReturnType<VolunteerService["getVolunteerProfile"]>>,
) => {
	if (!result.profile) {
		return {
			volunteer: result.volunteer,
			profile: null,
		};
	}

	return {
		volunteer: result.volunteer,
		profile: {
			...result.profile,
			currentLocation: result.profile.currentLocation ?? null,
			knownLocations: result.profile.knownLocations ?? [],
		},
	};
};

@Controller("/volunteers")
export class VolunteerController {
	constructor(
		@inject(VolunteerRepository)
		private readonly volunteerRepository: VolunteerRepository,
		@inject(VolunteerService)
		private readonly volunteerService: VolunteerService,
	) {}

	controller = new Hono()
		.get(
			"/:id",
			describeRoute({
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
								schema: resolver(emptyResponseEnvelopeSchema),
							},
						},
					},
					404: {
						description: "Volunteer not found",
						content: {
							"application/json": {
								schema: resolver(emptyResponseEnvelopeSchema),
							},
						},
					},
					500: {
						description: "Internal server error",
						content: {
							"application/json": {
								schema: resolver(emptyResponseEnvelopeSchema),
							},
						},
					},
				},
			}),
			async (c) => {
				try {
					const idParam = c.req.param("id");
					const volunteerId = parseVolunteerId(idParam);

					if (volunteerId === null) {
						return sendApiResponse(c, null, {
							kind: "clientError",
							message: "Invalid volunteer ID. Must be a positive integer.",
						});
					}

					const volunteer =
						await this.volunteerRepository.findProfileById(volunteerId);

					if (!volunteer) {
						return sendApiResponse(c, null, {
							kind: "notFound",
							message: `Volunteer with ID ${volunteerId} not found.`,
						});
					}

					const { ratings, averageStars } =
						await this.volunteerRepository.findRatingsById(volunteerId);
					const sessionData = await auth.api.getSession({
						headers: c.req.raw.headers,
					});
					const viewer = sessionData?.user
						? {
								userId: sessionData.user.id,
								role: (sessionData.user as any).role,
							}
						: undefined;
					const identity = mapUserIdentity(
						{
							userId: volunteer.userId,
							name: volunteer.name,
							email: volunteer.email,
							phone: volunteer.phone,
							image: volunteer.image,
							hiddenIdentity: volunteer.hiddenIdentity,
						},
						viewer,
					);

					return sendApiResponse(c, {
						id: volunteer.volunteerId,
						availability: volunteer.availability,
						trustScore: volunteer.trustScore,
						completedTasks: volunteer.completedTasks,
						user: {
							id: identity.id,
							name: identity.name,
							email: identity.email,
							phone: identity.phone,
							image: identity.image,
							alias: identity.alias,
							isIdentityHidden: identity.isIdentityHidden,
						},
						profile: {
							bio: volunteer.bio ?? null,
							languages: volunteer.languages ?? [],
							skills: volunteer.skills ?? [],
							maxDistanceKm: volunteer.maxDistanceKm ?? null,
						},
						ratingInfo: {
							averageStars,
							totalRatings: ratings.length,
							ratings,
						},
					});
				} catch (err) {
					logger.exception(err);
					return sendApiResponse(c, null, { kind: "serverError" });
				}
			},
		)
		.use(authMiddlware)
		.get(
			"/me/profile",
			describeRoute({
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
								schema: resolver(emptyResponseEnvelopeSchema),
							},
						},
					},
					404: {
						description: "Volunteer not found",
						content: {
							"application/json": {
								schema: resolver(emptyResponseEnvelopeSchema),
							},
						},
					},
					500: {
						description: "Internal server error",
						content: {
							"application/json": {
								schema: resolver(emptyResponseEnvelopeSchema),
							},
						},
					},
				},
			}),
			async (c) => {
				const session = c.get("session");
				if (!session) return sendApiResponse(c, null, { kind: "unauthorized" });

				try {
					const result = await this.volunteerService.getVolunteerProfile(
						session.userId,
					);
					return sendApiResponse(
						c,
						buildCurrentVolunteerProfileResponse(result),
					);
				} catch (err) {
					if (err instanceof NotFoundError)
						return sendApiResponse(c, null, { kind: "notFound" });
					return sendApiResponse(c, null, { kind: "serverError" });
				}
			},
		)

		.post(
			"/me/profile",
			describeRoute({
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
								schema: resolver(emptyResponseEnvelopeSchema),
							},
						},
					},
					401: {
						description: "Unauthorized",
						content: {
							"application/json": {
								schema: resolver(emptyResponseEnvelopeSchema),
							},
						},
					},
					500: {
						description: "Internal server error",
						content: {
							"application/json": {
								schema: resolver(emptyResponseEnvelopeSchema),
							},
						},
					},
				},
			}),
			async (c) => {
				const session = c.get("session");
				if (!session) return sendApiResponse(c, null, { kind: "unauthorized" });

				const body = await c.req.json();
				const parsed = volunteerProfileInputSchema.safeParse(body);
				if (!parsed.success)
					return sendApiResponse(c, null, {
						kind: "clientError",
						message: "Failed to validate input",
					});

				try {
					await this.volunteerService.createVolunteerProfile(
						session.userId,
						parsed.data,
					);
					const result = await this.volunteerService.getVolunteerProfile(
						session.userId,
					);
					return sendApiResponse(
						c,
						buildCurrentVolunteerProfileResponse(result),
						{
							kind: "created",
						},
					);
				} catch (err) {
					if (
						err instanceof Error &&
						err.message === "Volunteer profile already exists"
					)
						return sendApiResponse(c, null, {
							kind: "clientError",
							message: err.message,
						});
					return sendApiResponse(c, null, { kind: "serverError" });
				}
			},
		)

		.put(
			"/me/profile",
			describeRoute({
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
								schema: resolver(emptyResponseEnvelopeSchema),
							},
						},
					},
					401: {
						description: "Unauthorized",
						content: {
							"application/json": {
								schema: resolver(emptyResponseEnvelopeSchema),
							},
						},
					},
					404: {
						description: "Volunteer or volunteer profile not found",
						content: {
							"application/json": {
								schema: resolver(emptyResponseEnvelopeSchema),
							},
						},
					},
					500: {
						description: "Internal server error",
						content: {
							"application/json": {
								schema: resolver(emptyResponseEnvelopeSchema),
							},
						},
					},
				},
			}),
			async (c) => {
				const session = c.get("session");
				if (!session) return sendApiResponse(c, null, { kind: "unauthorized" });

				const body = await c.req.json();
				const parsed = volunteerProfileInputSchema.safeParse(body);
				if (!parsed.success)
					return sendApiResponse(c, null, {
						kind: "clientError",
						message: "Failed to validate input",
					});

				try {
					await this.volunteerService.updateVolunteerProfile(
						session.userId,
						parsed.data,
					);
					const result = await this.volunteerService.getVolunteerProfile(
						session.userId,
					);
					return sendApiResponse(
						c,
						buildCurrentVolunteerProfileResponse(result),
					);
				} catch (err) {
					if (err instanceof NotFoundError)
						return sendApiResponse(c, null, { kind: "notFound" });
					return sendApiResponse(c, null, { kind: "serverError" });
				}
			},
		)

		.post("/me/skills", async (c) => {
			const session = c.get("session");
			if (!session) return sendApiResponse(c, null, { kind: "unauthorized" });

			const body = await c.req.json();
			const parsed = skillInputSchema.safeParse(body);
			if (!parsed.success)
				return sendApiResponse(c, null, {
					kind: "clientError",
					message: "Invalid skill",
				});

			try {
				const updated = await this.volunteerService.addSkill(
					session.userId,
					parsed.data.skill,
				);
				return sendApiResponse(c, updated);
			} catch (err) {
				if (err instanceof Error && err.message === "Skill already exists")
					return sendApiResponse(c, null, {
						kind: "clientError",
						message: err.message,
					});
				if (err instanceof NotFoundError)
					return sendApiResponse(c, null, { kind: "notFound" });
				return sendApiResponse(c, null, { kind: "serverError" });
			}
		})

		.delete("/me/skills/:skill", async (c) => {
			const session = c.get("session");
			if (!session) return sendApiResponse(c, null, { kind: "unauthorized" });

			const skill = c.req.param("skill");
			try {
				const updated = await this.volunteerService.removeSkill(
					session.userId,
					skill,
				);
				return sendApiResponse(c, updated);
			} catch (err) {
				if (err instanceof Error && err.message === "Skill not found")
					return sendApiResponse(c, null, {
						kind: "notFound",
						message: err.message,
					});
				if (err instanceof NotFoundError)
					return sendApiResponse(c, null, { kind: "notFound" });
				return sendApiResponse(c, null, { kind: "serverError" });
			}
		});
}
