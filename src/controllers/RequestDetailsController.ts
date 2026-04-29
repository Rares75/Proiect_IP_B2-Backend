import { Hono } from "hono";
import type { AppEnv } from "../app";
import { Controller } from "../utils/controller";
import { inject } from "../di";
import { z } from "zod";
import { RequestDetailsService } from "../services/RequestDetailsService";
import { authMiddlware } from "../middlware/authMiddleware";

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

	controller = new Hono<AppEnv>()
		.use("*", authMiddlware)
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

			try {
				const id = Number(c.req.param("id"));
				if (!Number.isInteger(id)) {
					return c.json({ error: "Invalid id" }, 400);
				}

				const authorization =
					await this.requestDetailsService.authorizeDetailsMutation(
						id,
						c.get("session").userId,
					);
				if (authorization.status === "notFound") {
					return c.json({ error: "Task not found" }, 404);
				}
				if (authorization.status === "forbidden") {
					return c.json({ error: "Forbidden" }, 403);
				}
				if (authorization.status === "invalidStatus") {
					return c.json(
						{
							error: "Details can only be updated when task status is OPEN.",
						},
						409,
					);
				}

				const result = await this.requestDetailsService.upsertDetails(
					id,
					parsedBody.data,
				);

				if ("message" in result) {
					return c.json({ error: result.message }, result.status);
				}

				return c.json(result.data, result.status);
			} catch (_error) {
				return c.json({ error: "Could not update help request details" }, 500);
			}
		})

		.delete("/:id/details", async (c) => {
			const id = Number(c.req.param("id"));
			if (!Number.isInteger(id)) {
				return c.json({ error: "Invalid id" }, 400);
			}

			const authorization =
				await this.requestDetailsService.authorizeDetailsMutation(
					id,
					c.get("session").userId,
				);
			if (authorization.status === "notFound") {
				return c.json({ message: "Task not found." }, 404);
			}
			if (authorization.status === "forbidden") {
				return c.json({ message: "Forbidden" }, 403);
			}
			if (authorization.status === "invalidStatus") {
				return c.json(
					{
						message:
							"Details cannot be deleted when task status is MATCHED, IN_PROGRESS, COMPLETED, CANCELLED or REJECTED.",
					},
					409,
				);
			}

			const result =
				await this.requestDetailsService.deleteHelpRequestDetails(id);

			if (result.status === 204) {
				return c.body(null, 204);
			}

			return c.json(result.body, result.status);
		});
}
