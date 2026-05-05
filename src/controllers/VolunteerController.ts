import { Hono } from "hono";
import { describeRoute, resolver } from "hono-openapi";
import { z } from "zod";
import { Controller } from "../utils/controller";
import { inject } from "../di";
import { VolunteerRepository } from "../db/repositories/volunteer.repository";

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
	})
	.meta({ ref: "VolunteerUser" });

const volunteerProfileSchema = z
	.object({
		bio: z.string().nullable(),
		languages: z.array(z.string()),
		skills: z.array(z.string()),
		maxDistanceKm: z.number().nullable(),
	})
	.meta({ ref: "VolunteerProfile" });

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

const errorSchema = z
	.object({ error: z.string() })
	.meta({ ref: "VolunteerError" });

// ─── Controller ──────────────────────────────────────────────────────────────

@Controller("/volunteers")
export class VolunteerController {
	constructor(
		@inject(VolunteerRepository)
		private readonly volunteerRepository: VolunteerRepository,
	) {}

	controller = new Hono().get(
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
							schema: resolver(volunteerResponseSchema),
						},
					},
				},
				400: {
					description: "Invalid ID (not a positive integer)",
					content: {
						"application/json": {
							schema: resolver(errorSchema),
						},
					},
				},
				404: {
					description: "Volunteer not found",
					content: {
						"application/json": {
							schema: resolver(errorSchema),
						},
					},
				},
				500: {
					description: "Internal server error",
					content: {
						"application/json": {
							schema: resolver(errorSchema),
						},
					},
				},
			},
		}),
		async (c) => {
			try {
				const idParam = c.req.param("id");

				// Validare riguroasă pentru a satisface testul "badInputs"
				const volunteerId = Number(idParam);

				if (
					!Number.isInteger(volunteerId) ||
					volunteerId <= 0 ||
					String(volunteerId) !== idParam
				) {
					return c.json(
						{ error: "Invalid volunteer ID. Must be a positive integer." },
						400,
					);
				}

				const volunteer =
					await this.volunteerRepository.findProfileById(volunteerId);

				if (!volunteer) {
					return c.json(
						{ error: `Volunteer with ID ${volunteerId} not found.` },
						404,
					);
				}

				const { ratings, averageStars } =
					await this.volunteerRepository.findRatingsById(volunteerId);

				// Construim răspunsul respectând logica de hiddenIdentity
				return c.json({
					id: volunteer.volunteerId,
					availability: volunteer.availability,
					trustScore: volunteer.trustScore,
					completedTasks: volunteer.completedTasks,
					user: {
						id: volunteer.userId,
						name: volunteer.hiddenIdentity ? null : volunteer.name,
						email: volunteer.hiddenIdentity ? null : volunteer.email,
						phone: volunteer.hiddenIdentity ? null : volunteer.phone,
						image: volunteer.image,
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
				console.error("VOLUNTEER ERROR:", err);
				return c.json({ error: "Internal server error" }, 500);
			}
		},
	);
}
