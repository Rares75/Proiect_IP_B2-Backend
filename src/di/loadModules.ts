import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const shouldImportFile = (file: string) =>
	file.endsWith(".ts") && !file.endsWith(".test.ts");

export async function loadDiModules(...dirs: string[]) {
	for (const dir of dirs) {
		await loadDiModulesFromDirectory(dir);
	}
}

async function loadDiModulesFromDirectory(dir: string) {
	for (const file of readdirSync(dir)) {
		const fullPath = join(dir, file);

		if (statSync(fullPath).isDirectory()) {
			await loadDiModulesFromDirectory(fullPath);
		} else if (shouldImportFile(file)) {
			await import(fullPath);
		}
	}
}
