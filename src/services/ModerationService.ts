import { testUtils } from "better-auth/plugins";
import { Service } from "../di/decorators/service";
import blacklistConfig from "../utils/blacklist.json";

// temporar pana schimbam la un fisier json sau cv
const BANNED_WORDS = ["spam", "scam", "offensive_word"];

export class ModerationError extends Error {
	constructor(public message: string) {
		super(message);
		this.name = "ModerationError";
		Object.setPrototypeOf(this, ModerationError.prototype);
	}
}

@Service()
export class ModerationService {
	private exactWordsRegex: RegExp;

	constructor() {
		// compile regex when service starts
		const wordsPattern = blacklistConfig.exactWords.join("|");
		this.exactWordsRegex = new RegExp(`\\b(${wordsPattern})\\b`, "i"); // "i" makes it case-insensitive
	}

	/**
   * Normalizes "leet-speak" characters to regular letters
   * e.g., "$c@m" becomes "scam"
   */
	private normalizeText(text: string): string {
		return text
			.toLowerCase()
			.replace(/@/g, "a")
			.replace(/\$/g, "s")
			.replace(/0/g, "o")
			.replace(/1/g, "i")
			.replace(/3/g, "e")
			.replace(/4/g, "a")
			.replace(/5/g, "s")
			// Remove any punctuation that might be used to break up words (e.g., "s.c.a.m")
			.replace(/[.,/#!^&*;:{}=\-_`~()]/g, "");
	}

	/**
	 * Scans a string for inappropriate content.
	 * @returns result and flagged word (if applicable)
	 */
	public scanContent(text: string | null | undefined): {
		isClean: boolean;
		reason?: string
	} {
		if (!text || text.trim() === "") {
			return { isClean: true };
		}

		const normalizedText = this.normalizeText(text);

		// check exact words
		const words = normalizedText.split(/\s+/);
		if (this.exactWordsRegex.test(normalizedText)) {
			console.warn("[Moderation Service] Blocked due to exact word match");
			return { isClean: false, reason: "Inappropriate language detected" };
		}

		// check patterns
		for (const pattern of blacklistConfig.patterns) {
			const regex = new RegExp(pattern, "i");
			if (regex.test(normalizedText)) {
				console.warn(`[Moderation Service] Blocked due to pattern match: ${pattern}`);
				return { isClean: false, reason: "Suspicious phrase detected" };
			}
		}

		return { isClean: true };
	}
}
