import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

const rootDir = process.cwd();
const srcDir = join(rootDir, "src");
const outDir = join(rootDir, "dist");

async function collectFiles(dir: string): Promise<string[]> {
	const entries = await readdir(dir, { withFileTypes: true });
	const files = await Promise.all(
		entries.map(async (entry) => {
			const fullPath = join(dir, entry.name);

			if (entry.isDirectory()) {
				return await collectFiles(fullPath);
			}

			return [fullPath];
		}),
	);

	return files.flat();
}

function isRuntimeSourceFile(filePath: string) {
	return filePath.endsWith(".ts") &&
		!filePath.endsWith(".d.ts") &&
		!filePath.endsWith(".test.ts");
}

function isStaticAsset(filePath: string) {
	return filePath.endsWith(".json");
}

function getOutputPath(filePath: string) {
	const relativePath = relative(srcDir, filePath);

	if (relativePath === "index.ts") {
		return join(outDir, "index.mjs");
	}

	return join(outDir, relativePath);
}

async function transpileFile(filePath: string, outputPath: string) {
	await mkdir(dirname(outputPath), { recursive: true });

	const proc = Bun.spawnSync(
		[
			"bun",
			"build",
			"--no-bundle",
			filePath,
			"--outfile",
			outputPath,
			"--target",
			"bun",
			"--format",
			"esm",
		],
		{
			cwd: rootDir,
			stdout: "ignore",
			stderr: "pipe",
		},
	);

	if (proc.exitCode !== 0) {
		throw new Error(
			`Failed to transpile ${relative(srcDir, filePath)}:\n${new TextDecoder().decode(proc.stderr)}`,
		);
	}
}

async function copyAsset(filePath: string) {
	const relativePath = relative(srcDir, filePath);
	const outputPath = join(outDir, relativePath);

	await mkdir(dirname(outputPath), { recursive: true });
	await cp(filePath, outputPath);
}

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const srcFiles = await collectFiles(srcDir);
const runtimeFiles = srcFiles.filter(isRuntimeSourceFile).sort();
const staticAssets = srcFiles.filter(isStaticAsset).sort();

for (const filePath of runtimeFiles) {
	await transpileFile(resolve(filePath), getOutputPath(filePath));
}

for (const assetPath of staticAssets) {
	await copyAsset(assetPath);
}

await transpileFile(resolve(join(srcDir, "index.ts")), join(outDir, "index.js"));
