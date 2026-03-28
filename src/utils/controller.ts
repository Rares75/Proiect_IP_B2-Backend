import type { Hono } from "hono";

import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export function Controller(basePath: string) {
	return (target: any) => {
		const app = (globalThis as any).app;

		if (!app) {
			throw new Error("Controller used outside of app");
		}

		const controller: Hono = target.controller;

		if (!controller) {
			throw new Error("Missing static controller property");
		}

		app.route(basePath, controller);
	};
}

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
