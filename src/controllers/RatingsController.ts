import { Hono } from "hono";
import { z } from "zod";
import { Controller } from "../utils/controller";
import { ratingService } from "../services/RatingsService";

const createRatingSchema = z.object({
	taskAssignmentId: z.number().int().positive(),
	writtenByUserId: z.string().min(1, "writtenByUserId is required"),
	receivedByUserId: z.string().min(1, "receivedByUserId is required"),
	stars: z
		.number()
		.int()
		.min(1, "Stars must be at least 1")
		.max(5, "Stars must be at most 5"),
	comment: z.string().trim().min(1, "Comment is required"),
});

@Controller("/ratings")
export class RatingsController {
	static controller = new Hono()
		.post("/", async (c) => {
			try {
				const body = await c.req.json<{
					taskAssignmentId: number;
					writtenByUserId: string;
					receivedByUserId: string;
					stars: number;
					comment: string;
				}>();

				const parsed = createRatingSchema.safeParse(body);

				if (!parsed.success) {
					return c.json(
						{ error: "Invalid request body", details: parsed.error.flatten() },
						400,
					);
				}

				const result = await ratingService.createRating(parsed.data);
				return c.json(result ?? { data: null }, { status: result ? 200 : 404 });
			} catch (err) {
				console.error("RATING ERROR:", err);
				return c.json({ error: "Internal server error" }, 500);
			}
		})
		.get("/user/:userId", async (c) => {
			try {
				const userId = c.req.param("userId");
				const result = await ratingService.getRatingsForUser(userId);

				return c.json(result ?? { data: null }, { status: result ? 200 : 404 });
			} catch (err) {
				console.error("GET RATINGS ERROR: ", err);
				return c.json({ error: "Internal server error" }, 500);
			}
		})
		.get("/user/:userId/summary", async (c) => {
			try {
				const userId = c.req.param("userId");
				const result = await ratingService.getRatingsSummaryForUser(userId);

				return c.json(result ?? { data: null }, { status: result ? 200 : 404 });
			} catch (err) {
				console.error("GET RATINGS SUMMARY ERROR: ", err);
				return c.json({ error: "Internal server error" }, 500);
			}
		});
}
