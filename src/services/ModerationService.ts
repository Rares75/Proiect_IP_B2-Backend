//import { testUtils } from "better-auth/plugins";
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
	constructor(
		public message: string,
		public level: ModerationLevel,
		public reason: string,
	) {
		super(message);
		this.name = "ModerationError";
		Object.setPrototypeOf(this, ModerationError.prototype); // aparent bubuie js-ul daca nu fac asta
	}
}

interface ModerationResult {
	level: ModerationLevel;
	reason?: string;
}

interface CompiledReasonRule {
	id: string;
	message: string;
	blockedKeywordRegex: RegExp | null;
	flaggedKeywordRegex: RegExp | null;
	blockedPatterns: RegExp[];
	flaggedPatterns: RegExp[];
}

@Service()
export class ModerationService {
	private compiledRules: CompiledReasonRule[] = [];

	constructor() {
		// pre-compile all rules
		for (const reasonGroup of blacklistConfig.reasons) {
			const blockedTerms = reasonGroup.keywords
				.filter((k) => k.severity === ModerationLevel.BLOCKED)
				.map((k) => k.term);

			const flaggedTerms = reasonGroup.keywords
				.filter((k) => k.severity === ModerationLevel.FLAGGED)
				.map((k) => k.term);

			const blockedPatterns = reasonGroup.patterns
				.filter((p) => p.severity === ModerationLevel.BLOCKED)
				.map((p) => new RegExp(p.regex, "i"));

			const flaggedPatterns = reasonGroup.patterns
				.filter((p) => p.severity === ModerationLevel.FLAGGED)
				.map((p) => new RegExp(p.regex, "i"));

			this.compiledRules.push({
				id: reasonGroup.id,
				message: reasonGroup.message,
				blockedKeywordRegex: this.buildKeywordRegex(blockedTerms),
				flaggedKeywordRegex: this.buildKeywordRegex(flaggedTerms),
				blockedPatterns,
				flaggedPatterns,
			});
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
		if (!text || text.trim() === "") return { level: ModerationLevel.CLEAN };

		const normalized = this.normalizeText(text);

		// check all blocked rules
		for (const rule of this.compiledRules) {
			// check keywords
			if (rule.blockedKeywordRegex?.test(normalized)) {
				logger.warn(`[Moderation] BLOCKED keyword in category: ${rule.id}`);
				return { level: ModerationLevel.BLOCKED, reason: rule.message };
			}

			// check patterns
			for (const pattern of rule.blockedPatterns) {
				if (pattern.test(normalized)) {
					logger.warn(`[Moderation] BLOCKED pattern in category: ${rule.id}`);
					return { level: ModerationLevel.BLOCKED, reason: rule.message };
				}
			}
		}

		// check all flagged rules
		for (const rule of this.compiledRules) {
			// check keywords
			if (rule.flaggedKeywordRegex?.test(normalized)) {
				logger.info(`[Moderation] FLAGGED keyword in category: ${rule.id}`);
				return { level: ModerationLevel.FLAGGED, reason: rule.message };
			}

			// check patterns
			for (const pattern of rule.flaggedPatterns) {
				if (pattern.test(normalized)) {
					logger.info(`[Moderation] FLAGGED pattern in category: ${rule.id}`);
					return { level: ModerationLevel.FLAGGED, reason: rule.message };
				}
			}
		}

		return { level: ModerationLevel.CLEAN };
	}

	/**
	 * Takes an array of raw keywords and compiles them into a single regex
	 * that catches spaced-out variations.
	 */
	private buildKeywordRegex(terms: string[]): RegExp | null {
		if (!terms || terms.length === 0) {
			return null;
		}

		// add \s* between letters to catch spaced-out words (e.g., "s c a m")
		const processedTerms = terms.map((term) => term.split("").join("\\s*"));

		// combine with OR (|), wrap in word boundaries (\b), and make case-insensitive (i)
		return new RegExp(`\\b(${processedTerms.join("|")})\\b`, "i");
	}
}
