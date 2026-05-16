import { describe, expect, test } from "bun:test";
import { parseOrigins } from "../../src/utils/origins";

describe("parseOrigins", () => {
	test("trims empty values and trailing slashes from comma-separated origins", () => {
		expect(
			parseOrigins(
				" https://frontend.up.railway.app/, https://api.example.com ,, ",
			),
		).toEqual(["https://frontend.up.railway.app", "https://api.example.com"]);
	});
});
