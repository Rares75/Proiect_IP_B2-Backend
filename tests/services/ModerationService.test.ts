import { describe, it, expect } from "bun:test";
import { ModerationService, ModerationLevel } from "../../src/services/ModerationService";

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

    it("should not trigger false positives on substrings", () => {
        const result = service.scanContent("cryptography");
        expect(result.level).toBe(ModerationLevel.CLEAN);
    });
});