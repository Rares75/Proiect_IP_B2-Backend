import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import "../app";

export { Controller } from "../di/decorators/controller";

let isLoaded = false;
let loadingPromise: Promise<void> | undefined;

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

function resolveControllersDir(dir: string) {
	if (existsSync(dir)) return dir;

	const fallback = join(process.cwd(), "src", "controllers");
	if (dir.includes(`${join("tests", "src", "controllers")}`) && existsSync(fallback)) {
		return fallback;
	}

	return dir;
}

export async function loadControllers(dir: string) {
	// Dacă rutele au fost deja încărcate de alt test, ne oprim (evităm blocajul Bun)
	if (isLoaded) return;
	if (loadingPromise) return loadingPromise;

	loadingPromise = loadRecursively(resolveControllersDir(dir))
		.then(() => {
			isLoaded = true;
		})
		.finally(() => {
			loadingPromise = undefined;
		});

	return loadingPromise;
}
