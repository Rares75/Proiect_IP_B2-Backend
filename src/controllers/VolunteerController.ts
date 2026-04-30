import { Hono } from "hono";
import { Controller } from "../utils/controller";
import { inject } from "../di";
import { VolunteerRepository } from "../db/repositories/volunteer.repository";

@Controller("/volunteers")
export class VolunteerController {
	constructor(
		@inject(VolunteerRepository)
		private readonly volunteerRepository: VolunteerRepository,
	) {}

	controller = new Hono().get("/:id", async (c) => {
		const idParam = c.req.param("id");
		const volunteerId = Number(idParam);
		if (!Number.isInteger(volunteerId) || volunteerId <= 0) {
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
	});
}
