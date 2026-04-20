import { Hono } from "hono";
import { Controller } from "../utils/controller";
import { auth } from "../auth";

@Controller("/")
export class AuthController {
  static controller = new Hono()
    .post("/auth/sign-in/email", async (c) => {
      const body = await c.req.json();

      const response = await auth.api.signInEmail({
        body: {
          email: body.email,
          password: body.password,
        },
      });

      if (!response) {
        return c.json({ error: "Invalid credentials" }, 401);
      }

      await auth.api.sendVerificationOTP({
        body: {
          email: body.email,
          type: "sign-in",
        },
      });

      return c.json({ message: "OTP trimis pe mail", email: body.email });
	  
    })
    .on(["POST", "GET", "PUT", "DELETE"], "/auth/*", (c) => {
      return auth.handler(c.req.raw);
    });
}