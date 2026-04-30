import { Hono } from "hono";
import { Controller } from "../utils/controller";
import { inject } from "../di";
import { z } from "zod";
import { RequestDetailsService } from "../services/RequestDetailsService";

const requestDetailsSchema = z
	.object({
		notes: z
			.string({
				error: "Notes is required",
			})
			.trim()
			.min(1, "Notes is required"),
		languageNeeded: z
			.string({
				error: "Language needed is required",
			})
			.trim()
			.min(1, "Language needed is required")
			.max(50, "language needed must be at most 50 characters"),
		safetyNotes: z
			.string({
				error: "Safety notes is required",
			})
			.trim()
			.min(1, "Safety notes is required"),
	})
	.strict();

@Controller("/tasks")
export class RequestDetailsController {
	constructor(
		@inject(RequestDetailsService)
		private readonly requestDetailsService: RequestDetailsService,
	) {}

	controller = new Hono()
		.on(["POST", "PUT"], "/:id/details", async (c) => {
			const body = await c.req.json().catch(() => null);
			const parsedBody = requestDetailsSchema.safeParse(body);
			if (!parsedBody.success) {
				return c.json(
					{
						errors: parsedBody.error.issues.map((issue) => ({
							field: issue.path.length === 0 ? "body" : issue.path.join("."),
							message: issue.message,
						})),
					},
					400,
				);
			}

			const id = Number(c.req.param("id"));
			if (!Number.isInteger(id)) {
				return c.json({ error: "Invalid id" }, 400);
			}

			const result = await this.requestDetailsService.upsertDetails(
				id,
				parsedBody.data,
			);

			if ("message" in result) {
				return c.json({ error: result.message }, result.status);
			}

			return c.json(result.data, result.status);
		})

		.delete("/:id/details", async (c) => {
			const id = Number(c.req.param("id"));
			const result =
				await this.requestDetailsService.deleteHelpRequestDetails(id);

			if (result.status === 204) {
				return c.body(null, 204);
			}

			return c.json(result.body, result.status);
		});
}
