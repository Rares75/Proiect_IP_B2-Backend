import { Hono } from "hono";
import { Controller } from "../utils/controller";
import { auth } from "../auth";
import { profileService } from "../services/ProfileService";
import {
    createProfileSchema,
    updateProfileSchema,
} from "../utils/validators/profileValidator";

@Controller("/profile")
export class ProfileController {
    static controller = new Hono()

        .get("/me", async (c) => {
            const session = await auth.api.getSession({
                headers: c.req.raw.headers,
            });
            if (!session) return c.json({ error: "Unauthorized" }, 401);

            try {
                const profile = await profileService.getProfileByUserId(session.user.id);
                return c.json(profile, 200);
            } catch (error) {
                if (error instanceof Error && error.message.includes("not found"))
                    return c.json({ error: error.message }, 404);
                return c.json({ error: "Internal server error" }, 500);
            }
        })

        .get("/:userId", async (c) => {
            const { userId } = c.req.param();

            try {
                const profile = await profileService.getProfileByUserId(userId);
                return c.json(profile, 200);
            } catch (error) {
                console.error(error);
                if (error instanceof Error && error.message.includes("not found"))
                    return c.json({ error: error.message }, 404);
                return c.json({ error: "Internal server error" }, 500);
            }
        })

        .post("/", async (c) => {
            const session = await auth.api.getSession({
                headers: c.req.raw.headers,
            });
            if (!session) return c.json({ error: "Unauthorized" }, 401);

            const body = await c.req.json();
            const parsed = createProfileSchema.safeParse(body);
            if (!parsed.success)
                return c.json({ error: parsed.error.flatten() }, 400);

            try {
                const profile = await profileService.createProfile(
                    session.user.id,
                    parsed.data
                );
                return c.json(profile, 201);
            } catch (error) {
                if (error instanceof Error && error.message === "Profile already exists")
                    return c.json({ error: error.message }, 409);
                return c.json({ error: "Internal server error" }, 500);
            }
        })

        .put("/me", async (c) => {
            const session = await auth.api.getSession({
                headers: c.req.raw.headers,
            });
            if (!session) return c.json({ error: "Unauthorized" }, 401);

            const body = await c.req.json();
            const parsed = updateProfileSchema.safeParse(body);
            if (!parsed.success)
                return c.json({ error: parsed.error.flatten() }, 400);

            try {
                const updated = await profileService.updateProfile(
                    session.user.id,
                    parsed.data
                );
                return c.json(updated, 200);
            } catch (error) {
                if (error instanceof Error && error.message === "Profile not found")
                    return c.json({ error: error.message }, 404);
                return c.json({ error: "Internal server error" }, 500);
            }
        })

        .delete("/me", async (c) => {
            const session = await auth.api.getSession({
                headers: c.req.raw.headers,
            });
            if (!session) return c.json({ error: "Unauthorized" }, 401);

            try {
                await profileService.deleteProfile(session.user.id);
                return c.json({ message: "Profile deleted successfully" }, 200);
            } catch (error) {
                if (error instanceof Error && error.message === "Profile not found")
                    return c.json({ error: error.message }, 404);
                return c.json({ error: "Internal server error" }, 500);
            }
        });
}