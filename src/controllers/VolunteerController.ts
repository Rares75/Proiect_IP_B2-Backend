import { Hono } from "hono";
import { Controller } from "../utils/controller";
import { inject } from "../di";
import { VolunteerRepository } from "../db/repositories/volunteer.repository";
import { VolunteerService } from "../services/VolunteerService";
import { authMiddlware } from "../middlware/authMiddleware";
import { sendApiResponse } from "../utils/apiReponse";
import { NotFoundError } from "../utils/Errors";
import { logger } from "../utils/logger";
import {
	createCurrentVolunteerProfileDocs,
	getCurrentVolunteerProfileDocs,
	getVolunteerProfileDocs,
	updateCurrentVolunteerProfileDocs,
} from "../docs/volunteer.docs";
import {
	volunteerProfileInputSchema,
	volunteerSkillInputSchema,
} from "../utils/validators/volunteer/schemas";
import { validator } from "../utils/validators/honoValidator";

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

const buildVolunteerResponse = (
	volunteer: NonNullable<
		Awaited<ReturnType<VolunteerRepository["findProfileById"]>>
	>,
	ratingData: Awaited<ReturnType<VolunteerRepository["findRatingsById"]>>,
) => {
	const ratings = ratingData?.ratings ?? [];
	const averageStars = ratingData?.averageStars ?? null;

	return {
		id: volunteer.volunteerId,
		availability: volunteer.availability,
		trustScore: volunteer.trustScore,
		completedTasks: volunteer.completedTasks,
		user: {
			id: volunteer.userId,
			name: volunteer.hiddenIdentity ? null : (volunteer.name ?? null),
			email: volunteer.hiddenIdentity ? null : (volunteer.email ?? null),
			phone: volunteer.hiddenIdentity ? null : (volunteer.phone ?? null),
			image: volunteer.image ?? null,
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
	};
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
		.get("/:id", getVolunteerProfileDocs, async (c) => {
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

				const ratingData =
					await this.volunteerRepository.findRatingsById(volunteerId);
				const response = buildVolunteerResponse(volunteer, ratingData);

				return sendApiResponse(c, response);
			} catch (err) {
				logger.exception(err);
				return sendApiResponse(c, null, { kind: "serverError" });
			}
		})
		.use(authMiddlware)
		.get("/me/profile", getCurrentVolunteerProfileDocs, async (c) => {
			const session = c.get("session");
			if (!session) return sendApiResponse(c, null, { kind: "unauthorized" });

			try {
				const result = await this.volunteerService.getVolunteerProfile(
					session.userId,
				);
				return sendApiResponse(c, buildCurrentVolunteerProfileResponse(result));
			} catch (err) {
				if (err instanceof NotFoundError)
					return sendApiResponse(c, null, { kind: "notFound" });
				return sendApiResponse(c, null, { kind: "serverError" });
			}
		})

		.post(
			"/me/profile",
			createCurrentVolunteerProfileDocs,
			validator("json", volunteerProfileInputSchema, (result, c) => {
				if (!result.success) {
					return sendApiResponse(c, null, {
						kind: "clientError",
						message: "Failed to validate input",
					});
				}
			}),
			async (c) => {
				const session = c.get("session");
				if (!session) return sendApiResponse(c, null, { kind: "unauthorized" });

				try {
					await this.volunteerService.createVolunteerProfile(
						session.userId,
						c.req.valid("json"),
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
			updateCurrentVolunteerProfileDocs,
			validator("json", volunteerProfileInputSchema, (result, c) => {
				if (!result.success) {
					return sendApiResponse(c, null, {
						kind: "clientError",
						message: "Failed to validate input",
					});
				}
			}),
			async (c) => {
				const session = c.get("session");
				if (!session) return sendApiResponse(c, null, { kind: "unauthorized" });

				try {
					await this.volunteerService.updateVolunteerProfile(
						session.userId,
						c.req.valid("json"),
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

		.post(
			"/me/skills",
			validator("json", volunteerSkillInputSchema, (result, c) => {
				if (!result.success) {
					return sendApiResponse(c, null, {
						kind: "clientError",
						message: "Invalid skill",
					});
				}
			}),
			async (c) => {
				const session = c.get("session");
				if (!session) return sendApiResponse(c, null, { kind: "unauthorized" });

				try {
					const { skill } = c.req.valid("json");
					const updated = await this.volunteerService.addSkill(
						session.userId,
						skill,
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
			},
		)

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
