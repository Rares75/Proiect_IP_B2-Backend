import { Hono } from "hono";
import { Controller } from "../utils/controller";
import { InteractionsService } from "../services/InteractionsService";
import { error } from "better-auth/api";

@Controller("/users")
export class InteractionsController {
    static controller = new Hono().get("/:userId/interactions", async (c) => {
        try {
            const userId = c.req.param("userId");
            const result = await InteractionsService.getInteractionsForUser(userId);

            if (result.status === 200) {
                return c.json(result.body, 200);
            } else {
                return c.json(result.body, result.status);
            }
        } catch (err) {
            console.error("GET INTERACTIONS ERROR: ", err);
            return c.json({error: "Internal server error" }, 500);
        }
    });
}