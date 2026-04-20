import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth";
import { logger } from "hono/logger";
import { db } from "./db";
import * as schema from "./db/auth-schema";
import { eq } from "drizzle-orm";
import type { Context, Next } from "hono";
const app = new Hono().basePath("/api").use(logger());

app.use(
  "/auth/*",
  cors({
    origin: process.env.CLIENT_URL ?? "http://localhost:5173",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);
app.post("/auth/email-otp/check-verification-otp", async (c) => {
  const body = await c.req.json();
  
  const clonedRequest = new Request(c.req.raw.url, {
    method: c.req.raw.method,
    headers: c.req.raw.headers,
    body: JSON.stringify(body),
  });

  const response = await auth.handler(clonedRequest);
  
  if (response.status === 200 && body?.type === "email-verification" && body?.email) {
    await db.update(schema.user)
      .set({ emailVerified: true })
      .where(eq(schema.user.email, body.email));
  }
  
  return response;
});

export const requireAuth = async (c: Context, next: Next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  c.set("user", session.user);
  c.set("session", session.session);
  await next();
};

(globalThis as any).app = app;

export default app;
