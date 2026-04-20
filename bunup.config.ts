import type { DefineConfigItem } from "bunup";

const config: DefineConfigItem = {
	target: "bun",
	format: ["esm"],
	drop: ["console", "debugger"],
	packages: "external",
	sourcemap: "external",
	unused: {
		level: "warn",
	},
	exports: true,
	minify: false,
	dts: {
		minify: false,
	},
};

export default config;
