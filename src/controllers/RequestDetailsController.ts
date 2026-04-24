import { Hono } from "hono";
import { Controller } from "../utils/controller";
import { inject } from "../di";
import { z } from "zod";
import { RequestDetailsService } from "../services/RequestDetailsService";

const requestDetailsSchema = z.object({
	notes: z.string().min(1, "notes is required"),
	languageNeeded: z.string().min(1, "language needed is required"),
	safetyNotes: z.string().min(1, "safety notes is required"),
});

@Controller("/tasks")
export class RequestDetailsController {
	constructor(
		@inject(RequestDetailsService)
		private readonly requestDetailsService: RequestDetailsService,
	) {}

	controller = new Hono()
		.post("/:id/details", async (c) => {
			const id = Number(c.req.param("id"));
			if (!Number.isInteger(id) || id <= 0) {
				return c.json({ message: "Invalid id" }, 400);
			}

			const body = await c.req.json().catch(() => null);
			const parsedBody = requestDetailsSchema.safeParse(body);
			if (!parsedBody.success) {
				return c.json(
					{
						errors: parsedBody.error.issues.map((issue) => ({
							field: issue.path.join("."),
							message: issue.message,
						})),
					},
					400,
				);
			}

			try {
				const result = await this.requestDetailsService.upsertDetails(
					id,
					parsedBody.data,
				);

				if (result.notFound) {
					return c.json({ message: "Task not found" }, 404);
				}

				return c.json(result.data, 200);
			} catch (_error) {
				return c.json({ message: "Could not update help request details" }, 500);
			}
		})
		.delete("/:id/details", async (c) => {
			const id = Number(c.req.param("id"));
			const result = await this.requestDetailsService.deleteHelpRequestDetails(id);

			if (result.status === 204) {
				return c.body(null, 204);
			}

			return c.json(result.body, result.status);
		});
}
