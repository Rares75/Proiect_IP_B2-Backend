export const sanitizeObjectName = (fileName: string) => {
	const normalizedName = fileName.trim().replace(/^.*[\\/]/, "");
	const extensionIndex = normalizedName.lastIndexOf(".");
	const baseName =
		extensionIndex > 0
			? normalizedName.slice(0, extensionIndex)
			: normalizedName;
	const extension =
		extensionIndex > 0
			? normalizedName.slice(extensionIndex).toLowerCase()
			: "";

	const safeBaseName =
		baseName
			.normalize("NFKD")
			.replace(/[^\w.-]+/g, "-")
			.replace(/-+/g, "-")
			.replace(/^-|-$/g, "")
			.toLowerCase() || "file";

	const safeExtension = extension.replace(/[^.\w-]+/g, "");
	return `${safeBaseName}${safeExtension}`;
};

export const encodeObjectKeyForUrl = (key: string) =>
	key
		.split("/")
		.map((segment, index) =>
			index === 0 ? segment : encodeURIComponent(segment),
		)
		.join("/");
