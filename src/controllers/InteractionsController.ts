import { Hono } from "hono";
import { Controller } from "../utils/controller";
import { InteractionsService } from "../services/InteractionsService";
import { error } from "better-auth/api";
import { inject } from "../di"

@Controller("/users")
export class InteractionsController {
    constructor(
        @inject(InteractionsService) 
        private readonly interactionsService: InteractionsService,
    ) {}

    controller = new Hono().get("/:userId/interactions", async (c) => {
        try {

            const userId = c.req.param("userId");
            const page = Number(c.req.query("page") ?? 1);
            const limit = Number(c.req.query("limit") ?? 10);

            if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1 || limit > 100) {
                return c.json({ error: "Invalid pagination parameters." }, 400);
            }

            const result = await this.interactionsService.getInteractionsForUser(userId, page, limit);

            return c.json(result.body, result.status);

        } catch (err) {
            console.error("GET INTERACTIONS ERROR: ", err);
            return c.json({error: "Internal server error" }, 500);
        }
    });
}