import { describe, it, expect } from "bun:test";
import {
	ModerationService,
	ModerationLevel,
} from "../../src/services/ModerationService";

describe("ModerationService", () => {
	const service = new ModerationService();

	it("should allow clean text to pass", () => {
		const result = service.scanContent("i need help with my homework");
		expect(result.level).toBe(ModerationLevel.CLEAN);
	});

	it("should handle empty or null content safely", () => {
		expect(service.scanContent("").level).toBe(ModerationLevel.CLEAN);
		expect(service.scanContent("   ").level).toBe(ModerationLevel.CLEAN);
		expect(service.scanContent(undefined).level).toBe(ModerationLevel.CLEAN);
	});

	// assumes "scam" is blocked
	it("should block exact bad words", () => {
		const result = service.scanContent("looks like a scam to me");
		expect(result.level).toBe(ModerationLevel.BLOCKED);
	});

	// assumes "crypto" is flagged
	it("should flag suspicious words", () => {
		const result = service.scanContent("let me tell you about crypto");
		expect(result.level).toBe(ModerationLevel.FLAGGED);
	});

	it("should catch bypasses (normalization)", () => {
		const result = service.scanContent("$c@m");
		expect(result.level).toBe(ModerationLevel.BLOCKED);
	});

	it("should catch spaced-out bypasses (normalization)", () => {
		const result = service.scanContent("s . c . a . m");
		expect(result.level).toBe(ModerationLevel.BLOCKED);
	});

	it("should catch words that are both obfuscated and spaced out", () => {
		const result = service.scanContent("$ c @ m");
		expect(result.level).toBe(ModerationLevel.BLOCKED);
	});

	it("should not trigger false positives on substrings", () => {
		const result = service.scanContent("cryptography");
		expect(result.level).toBe(ModerationLevel.CLEAN);
	});

	// assumes "kill" is a blocked keyword with a reason that contains "violence"
	it("should return the correct specific reason message for a category", () => {
		const result = service.scanContent("i will kill you");
		expect(result.level).toBe(ModerationLevel.BLOCKED);
		expect(result.reason).toContain("violence");
	});

	it("should prioritize BLOCKED over FLAGGED if both are present", () => {
		const result = service.scanContent("scam with crypto");
		expect(result.level).toBe(ModerationLevel.BLOCKED);
		expect(result.reason).toContain("scam");
	});

	it("should trigger based on custom patterns in categories", () => {
		const result = service.scanContent("please click this suspicious link");
		expect(result.level).toBe(ModerationLevel.FLAGGED);
	});

	it("should handle extremely long strings (stress test)", () => {
        const longString = "clean ".repeat(1000) + "scam";
        const result = service.scanContent(longString);
        expect(result.level).toBe(ModerationLevel.BLOCKED);
    });

    it("should handle mixed invisible characters and newlines", () => {
        const sneakyInput = "s\n\tc\r  a\u200Bm"; // scam with newlines, tabs, and zero-width spaces
        const result = service.scanContent(sneakyInput);
        expect(result.level).toBe(ModerationLevel.BLOCKED);
    });
});
