import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import "../app";

export { Controller } from "../di/decorators/controller";

let isLoaded = false;

async function loadRecursively(dir: string) {
	for (const file of readdirSync(dir)) {
		const fullPath = join(dir, file);
		if (statSync(fullPath).isDirectory()) {
			await loadRecursively(fullPath);
		} else if (file.endsWith(".ts") && !file.endsWith(".test.ts")) {
			await import(fullPath);
		}
	}
}

export async function loadControllers(dir: string) {
	// Dacă rutele au fost deja încărcate de alt test, ne oprim (evităm blocajul Bun)
	if (isLoaded) return;
	isLoaded = true;

	await loadRecursively(dir);
}
