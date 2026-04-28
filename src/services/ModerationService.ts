import { testUtils } from "better-auth/plugins";
import { Service } from "../di/decorators/service";
import { logger } from "../utils/logger";
import blacklistConfig from "../utils/moderation/blacklist.json";
import normalizationConfig from "../utils/moderation/normalization.json";

export enum ModerationLevel {
	CLEAN = "CLEAN",
	FLAGGED = "FLAGGED",
	BLOCKED = "BLOCKED",
}

export class ModerationError extends Error {
	constructor(public message: string) {
		super(message);
		this.name = "ModerationError";
		Object.setPrototypeOf(this, ModerationError.prototype);
	}
}

interface ModerationResult {
	level: ModerationLevel;
	reason?: string;
}

@Service()
export class ModerationService {
	private blockedRegex: RegExp | null = null;
	private flaggedRegex: RegExp | null = null;

	constructor() {
		// add optional regex spaces in the string
		const makeSpacedPattern = (term: string) => term.split("").join("\\s*");

		const blockedTerms = blacklistConfig.keywords
			.filter((k) => k.severity === ModerationLevel.BLOCKED)
			.map((k) => makeSpacedPattern(k.term));

		const flaggedTerms = blacklistConfig.keywords
			.filter((k) => k.severity === ModerationLevel.FLAGGED)
			.map((k) => makeSpacedPattern(k.term));

		if (blockedTerms.length > 0) {
			this.blockedRegex = new RegExp(`\\b(${blockedTerms.join("|")})\\b`, "i");
		}

		if (flaggedTerms.length > 0) {
			this.flaggedRegex = new RegExp(`\\b(${flaggedTerms.join("|")})\\b`, "i");
		}
	}

	/**
	 * Normalizes "leet-speak" characters to regular letters
	 * e.g., "$c@m" becomes "scam"
	 */
	private normalizeText(text: string): string {
		let normalized = text.toLowerCase();

		// apply mapping
		for (const [target, symbols] of Object.entries(
			normalizationConfig.mappings,
		)) {
			for (const symbol of symbols) {
				// escape special regex characters in the symbol (like $ or |)
				const escapedSymbol = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
				const regex = new RegExp(escapedSymbol, "g");
				normalized = normalized.replace(regex, target);
			}
		}

		// remove characters that break up words (s.c.a.m, s-c-a-m)
		return normalized
			.replace(/[^a-z0-9\s]/g, "") // keep only lowercase letters
			.replace(/\s+/g, " ") // make every space a single space
			.trim();
	}

	/**
	 * Scans a string for inappropriate content.
	 * @returns result and flagged word (if applicable)
	 */
	public scanContent(text: string | null | undefined): ModerationResult {
		if (!text || text.trim() === "") {
			return { level: ModerationLevel.CLEAN };
		}

		const normalized = this.normalizeText(text);

		// check blocked
		if (this.blockedRegex?.test(normalized)) {
			logger.warn(
				`[Moderation Service] BLOCKED (Keyword). Snippet: "${normalized.substring(0, 50)}"`,
			);
			return {
				level: ModerationLevel.BLOCKED,
				reason: "Content violates safety policies.",
			};
		}

		// check blocked patterns
		for (const p of blacklistConfig.patterns.filter(
			(p) => p.severity === ModerationLevel.BLOCKED,
		)) {
			if (new RegExp(p.regex, "i").test(normalized)) {
				logger.warn(
					`[Moderation Service] BLOCKED (Pattern). Snippet: "${normalized.substring(0, 50)}"`,
				);
				return {
					level: ModerationLevel.BLOCKED,
					reason: "Blacklisted pattern detected.",
				};
			}
		}

		// check flagged
		if (this.flaggedRegex?.test(normalized)) {
			logger.info(
				`[Moderation Service] FLAGGED (Keyword). Snippet: "${normalized.substring(0, 50)}"`,
			);
			return {
				level: ModerationLevel.FLAGGED,
				reason: "Suspicious activity detected.",
			};
		}

		// check flagged patterns
		for (const p of blacklistConfig.patterns.filter(
			(p) => p.severity === ModerationLevel.FLAGGED,
		)) {
			if (new RegExp(p.regex, "i").test(normalized)) {
				logger.info(
					`[Moderation Service] FLAGGED (Pattern). Snippet: "${normalized.substring(0, 50)}"`,
				);
				return {
					level: ModerationLevel.FLAGGED,
					reason: "Request flagged for review.",
				};
			}
		}

		return { level: ModerationLevel.CLEAN };
	}
}
