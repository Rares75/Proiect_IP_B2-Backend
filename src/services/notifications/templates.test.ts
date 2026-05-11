import { describe, expect, test } from "bun:test";
import {
	buildNewRequestText,
	buildOfferAcceptedText,
	buildOfferReceivedText,
} from "./templates";

describe("notification templates", () => {
	test("builds new request text", () => {
		expect(buildNewRequestText("Cumparaturi")).toBe(
			"Un task nou in zona ta: Cumparaturi",
		);
	});

	test("builds offer received text", () => {
		expect(buildOfferReceivedText("Cumparaturi")).toBe(
			"Un voluntar a oferit ajutor pentru: Cumparaturi",
		);
	});

	test("builds offer accepted text", () => {
		expect(buildOfferAcceptedText("Cumparaturi")).toBe(
			"Oferta ta pentru Cumparaturi a fost acceptata",
		);
	});
});
