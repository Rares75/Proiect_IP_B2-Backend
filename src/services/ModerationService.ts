import { testUtils } from "better-auth/plugins";
import { Service } from "../di/decorators/service";

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
	/**
	 * Scans a string for inappropriate content.
	 * @returns result and flagged word (if applicable)
	 */
	public scanContent(text: string | null | undefined): {
		isClean: boolean;
		flaggedWord?: string;
	} {
		if (!text || text.trim() === "") {
			return { isClean: true };
		}

		const normalizedText = text
			.toLowerCase()
			.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
		const words = normalizedText.split(/\s+/);

		for (const word of words) {
			if (BANNED_WORDS.includes(word)) {
				console.warn(
					`[ModerationService] Blocked request containing word: '${word}'`,
				);
				return { isClean: false, flaggedWord: word };
			}
		}

		return { isClean: true };
	}
}
