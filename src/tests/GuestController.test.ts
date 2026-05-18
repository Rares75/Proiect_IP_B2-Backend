import { beforeAll, describe, expect, test } from "bun:test";
import { join } from "node:path";

import app from "../app";
import { loadControllers } from "../utils/controller";
import type { ApiResponseType } from "../utils/apiReponse";

type GuestSessionResponse = {
	sessionId: string;
};

const uuidV4Pattern =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("GuestController", () => {
	beforeAll(async () => {
		await loadControllers(join(import.meta.dir, "../controllers"));
	});

	test("POST /guest/session creates a guest session id", async () => {
		const response = await app.request("http://localhost/api/guest/session", {
			method: "POST",
		});

		const payload =
			(await response.json()) as ApiResponseType<GuestSessionResponse>;

		expect(response.status).toBe(201);
		expect(payload.data).toHaveProperty("sessionId");
		expect(payload.data?.sessionId).toMatch(uuidV4Pattern);
	});

	test("POST /guest/session returns different ids for consecutive requests", async () => {
		const firstResponse = await app.request(
			"http://localhost/api/guest/session",
			{
				method: "POST",
			},
		);
		const secondResponse = await app.request(
			"http://localhost/api/guest/session",
			{
				method: "POST",
			},
		);

		const firstPayload = (await firstResponse.json()) as GuestSessionResponse;
		const secondPayload = (await secondResponse.json()) as GuestSessionResponse;

		expect(firstResponse.status).toBe(201);
		expect(secondResponse.status).toBe(201);
		expect((firstPayload as any).data.sessionId).toMatch(uuidV4Pattern);
		expect((secondPayload as any).data.sessionId).toMatch(uuidV4Pattern);
		expect((firstPayload as any).data.sessionId).not.toBe(
			(secondPayload as any).data.sessionId,
		);
	});
});
