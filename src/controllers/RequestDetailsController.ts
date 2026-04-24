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
    ) { }

    controller = new Hono()
        .post("/:id/details", async (c) => {
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
                if (Number.isNaN(id)) {
                    return c.json({ message: "Invalid id" }, 400);
                }
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
