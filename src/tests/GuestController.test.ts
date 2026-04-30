import { describe, expect, test } from "bun:test";

import app from "../app";
import "../controllers/GuestController";

type GuestSessionResponse = {
	sessionId: string;
};

const uuidV4Pattern =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("GuestController", () => {
	test("POST /guest/session creates a guest session id", async () => {
		const response = await app.request("http://localhost/api/guest/session", {
			method: "POST",
		});

		const payload = (await response.json()) as GuestSessionResponse &
			Record<string, unknown>;

		expect(response.status).toBe(201);
		expect(Object.keys(payload)).toEqual(["sessionId"]);
		expect(payload.sessionId).toMatch(uuidV4Pattern);
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
		expect(firstPayload.sessionId).toMatch(uuidV4Pattern);
		expect(secondPayload.sessionId).toMatch(uuidV4Pattern);
		expect(firstPayload.sessionId).not.toBe(secondPayload.sessionId);
	});
});
