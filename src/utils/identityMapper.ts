export type IdentityViewer = {
	userId?: string | null;
	role?: string | null;
};

export type UserIdentityInput = {
	userId?: string | null;
	name?: string | null;
	email?: string | null;
	phone?: string | null;
	image?: string | null;
	username?: string | null;
	hiddenIdentity?: boolean | null;
};

export type AnonymizedUserDto = {
	id: string;
	alias: string;
	isIdentityHidden: true;
};

export const createAnonymousAlias = (seed?: string | number | null) => {
	const source = String(seed ?? "unknown");
	let hash = 0;

	for (let i = 0; i < source.length; i += 1) {
		hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
	}

	return `User ${hash.toString(36).padStart(6, "0").slice(0, 6).toUpperCase()}`;
};

export const mapUserIdOnly = (userId: string): AnonymizedUserDto => {
	const alias = createAnonymousAlias(userId);

	return {
		id: alias,
		alias,
		isIdentityHidden: true,
	};
};

export const canViewRealIdentity = (
	identity: UserIdentityInput,
	viewer?: IdentityViewer,
) => {
	if (!identity.hiddenIdentity) {
		return true;
	}

	if (!viewer) {
		return false;
	}

	return viewer.role === "admin" || viewer.userId === identity.userId;
};

export const mapUserIdentity = (
	identity: UserIdentityInput,
	viewer?: IdentityViewer,
) => {
	const canView = canViewRealIdentity(identity, viewer);
	const alias = createAnonymousAlias(identity.userId ?? identity.username);

	if (canView) {
		return {
			id: identity.userId ?? null,
			name: identity.name ?? null,
			email: identity.email ?? null,
			phone: identity.phone ?? null,
			image: identity.image ?? null,
			username: identity.username ?? null,
			alias,
			isIdentityHidden: Boolean(identity.hiddenIdentity),
		};
	}

	return {
		id: alias,
		name: null,
		email: null,
		phone: null,
		image: null,
		username: null,
		alias,
		isIdentityHidden: true,
	};
};

export const getDisplayNameForIdentity = (
	identity: UserIdentityInput,
	viewer?: IdentityViewer,
) => {
	if (!canViewRealIdentity(identity, viewer)) {
		return createAnonymousAlias(identity.userId ?? identity.username);
	}

	return identity.name ?? identity.username ?? null;
};
