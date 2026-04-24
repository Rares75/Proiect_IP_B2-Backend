import { Hono } from "hono";
import { Controller } from "../utils/controller";
import { inject } from "../di";
import { HelpRequestDetailsService } from "../services/RequestDetailsService";
import { z } from "zod";

// Schema de validare
const requestDetailsSchema = z.object({
    notes: z.string().min(1, "notes is required"),
    languageNeeded: z.string().min(1, "language needed is required"),
    safetyNotes: z.string().min(1, "safety notes is required"),
});

// Middleware de validare
const validate = (schema: z.ZodSchema) => async (c: any, next: any) => {
    const body = await c.req.json().catch(() => null);
    const result = schema.safeParse(body);
    if (!result.success) {
        return c.json(
            {
                errors: result.error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                })),
            },
            400
        );
    }
    return next();
};

@Controller("/tasks")
export class HelpRequestDetailsController {
    constructor(
        @inject(HelpRequestDetailsService)
        private readonly helpRequestDetailsService: HelpRequestDetailsService,
    ) { }

    controller = new Hono()
        .post(
            "/:id/details",
            validate(requestDetailsSchema), // ← middleware aplicat aici, inainte de handler
            async (c) => {
                try {
                    const id = Number(c.req.param("id"));
                    if (isNaN(id)) {
                        return c.json({ message: "Invalid id" }, 400);
                    }
                    const body = await c.req.json();
                    const result = await this.helpRequestDetailsService.upsertDetails(id, body);

                    if (result.notFound) {
                        return c.json({ message: "Task not found" }, 404);
                    }

			return c.json(result.data, 200);
		} catch (_error) {
			return c.json({ message: "Could not update help request details" }, 500);
		}
	});
}
