import { Hono } from "hono";
import { registerValidation } from "./validation";

const app = new Hono().basePath("/api");

registerValidation(app);

app.get("/", (c) => {
	return c.text("OK");
});

app.post("/help", async (c) => {
	const body = await c.req.json();

	return c.json({
		ok: true,
		body,
	});
});

export default app;