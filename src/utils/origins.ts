export const parseOrigins = (value?: string | null) =>
	(value ?? "")
		.split(",")
		.map((origin) => origin.trim().replace(/\/+$/, ""))
		.filter(Boolean);

export const getAllowedOrigins = () =>
	Array.from(
		new Set([
			...parseOrigins(Bun.env.CLIENT_URL),
			...parseOrigins(Bun.env.SERVER_URL),
			...parseOrigins(Bun.env.TRUSTED_ORIGINS),
		]),
	);
