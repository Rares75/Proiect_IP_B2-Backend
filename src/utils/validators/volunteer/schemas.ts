import { z } from "zod";

export const volunteerRatingItemSchema = z
	.object({
		id: z.number().int().positive(),
		stars: z.number().int().min(1).max(5),
		comment: z.string().nullable(),
		createdAt: z.string().datetime(),
		writtenByUserId: z.string(),
	})
	.meta({ ref: "RatingItem" });

export const volunteerUserSchema = z
	.object({
		id: z.string(),
		name: z.string().nullable(),
		email: z.string().nullable(),
		phone: z.string().nullable(),
		image: z.string().nullable(),
	})
	.meta({ ref: "VolunteerUser" });

export const volunteerLocationSchema = z.object({
	x: z.number(),
	y: z.number(),
});

export const volunteerKnownLocationSchema = z.object({
	id: z.number().int().positive(),
	city: z.string().nullable(),
	addressText: z.string().nullable(),
	location: volunteerLocationSchema,
});

export const volunteerProfileSchema = z
	.object({
		bio: z.string().nullable(),
		languages: z.array(z.string()),
		skills: z.array(z.string()),
		maxDistanceKm: z.number().nullable(),
		currentLocation: volunteerLocationSchema.nullable().optional(),
		knownLocations: z.array(volunteerKnownLocationSchema).optional(),
	})
	.meta({ ref: "VolunteerProfile" });

export const knownLocationInputSchema = z.object({
	city: z.string().nullable().optional(),
	addressText: z.string().nullable().optional(),
	location: volunteerLocationSchema,
});

export const volunteerProfileInputSchema = z
	.object({
		skills: z.array(z.string()).optional(),
		maxDistanceKm: z.number().positive().nullable().optional(),
		currentLocation: volunteerLocationSchema.nullable().optional(),
		knownLocations: z.array(knownLocationInputSchema).optional(),
		availability: z.boolean().optional(),
	})
	.meta({ ref: "VolunteerProfileInput" });

export const volunteerSkillInputSchema = z
	.object({
		skill: z.string().min(1),
	})
	.meta({ ref: "SkillInput" });

export const volunteerRatingInfoSchema = z
	.object({
		averageStars: z.number().nullable(),
		totalRatings: z.number().int(),
		ratings: z.array(volunteerRatingItemSchema),
	})
	.meta({ ref: "VolunteerRatingInfo" });

export const volunteerResponseSchema = z
	.object({
		id: z.number().int().positive(),
		availability: z.boolean(),
		trustScore: z.number(),
		completedTasks: z.number().int(),
		user: volunteerUserSchema,
		profile: volunteerProfileSchema,
		ratingInfo: volunteerRatingInfoSchema,
	})
	.meta({
		ref: "VolunteerResponse",
	});

export const currentVolunteerSchema = z
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

export const currentVolunteerProfileResponseSchema = z
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

export const volunteerApiEnvelopeSchema = z.object({
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

export const volunteerResponseEnvelopeSchema = volunteerApiEnvelopeSchema
	.extend({
		data: volunteerResponseSchema,
	})
	.meta({ ref: "VolunteerResponseEnvelope" });

export const currentVolunteerProfileResponseEnvelopeSchema =
	volunteerApiEnvelopeSchema
		.extend({
			data: currentVolunteerProfileResponseSchema,
		})
		.meta({ ref: "CurrentVolunteerProfileResponseEnvelope" });

export const emptyVolunteerResponseEnvelopeSchema = volunteerApiEnvelopeSchema
	.extend({
		data: z.null(),
	})
	.meta({ ref: "VolunteerEmptyResponseEnvelope" });
