import {
	createAnonymousAlias,
	getDisplayNameForIdentity,
	type IdentityViewer,
} from "./identityMapper";

export const sanitizeAnonymousTask = (
	task: any,
	currentUserIdOrViewer?: string | IdentityViewer,
) => {
	const viewer =
		typeof currentUserIdOrViewer === "string"
			? { userId: currentUserIdOrViewer }
			: currentUserIdOrViewer;
	const { ownerName, ownerUsername, ownerHiddenIdentity, ...baseTask } = task;

	const isGuestTask = baseTask.requestedByUserId === null;
	const isOwner = !isGuestTask && baseTask.requestedByUserId === viewer?.userId;
	const isAdmin = viewer?.role === "admin";
	const shouldHideOwnerIdentity = Boolean(ownerHiddenIdentity);
	const ownerAlias = createAnonymousAlias(baseTask.requestedByUserId);
	const ownerIdentity = {
		userId: baseTask.requestedByUserId,
		name: ownerName,
		username: ownerUsername,
		hiddenIdentity: ownerHiddenIdentity,
	};

	if (isOwner || isAdmin) {
		return {
			...baseTask,
			...(isOwner ? { isMine: true } : {}),
			ownerName,
			ownerUsername,
			ownerAlias,
			displayName: task.anonymousMode
				? (ownerUsername ?? ownerAlias)
				: getDisplayNameForIdentity(ownerIdentity, viewer),
		};
	}

	if (isGuestTask) {
		const { requestedByUserId, ...restOfTask } = baseTask;
		return { ...restOfTask, displayName: null };
	}

	if (task.anonymousMode) {
		const { requestedByUserId, ...restOfTask } = baseTask;
		return {
			...restOfTask,
			displayName: ownerUsername ?? ownerAlias,
			ownerAlias,
			isIdentityHidden: true,
		};
	}

	if (shouldHideOwnerIdentity) {
		const { requestedByUserId, ...restOfTask } = baseTask;
		return {
			...restOfTask,
			displayName: ownerAlias,
			ownerAlias,
			isIdentityHidden: true,
		};
	}

	return { ...baseTask, displayName: ownerName ?? null };
};
