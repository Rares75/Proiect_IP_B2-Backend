import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
export { Controller } from "../di/decorators/controller";

export async function loadControllers(dir: string) {
	for (const file of readdirSync(dir)) {
		const fullPath = join(dir, file);

		if (statSync(fullPath).isDirectory()) {
			await loadControllers(fullPath);
		} else if (file.endsWith(".ts")) {
			await import(fullPath);
		}
	}
}
