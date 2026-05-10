export const sanitizeAnonymousTask = (task: any, currentUserId?: string) => {
	const { ownerName, ownerUsername, ...baseTask } = task;

	const isGuestTask = baseTask.requestedByUserId === null;
	const isOwner = !isGuestTask && baseTask.requestedByUserId === currentUserId;

	if (isOwner) {
		return {
			...baseTask,
			isMine: true,
			ownerName,
			ownerUsername,
			displayName: task.anonymousMode ? ownerUsername : ownerName,
		};
	}

	if (isGuestTask) {
		const { requestedByUserId, ...restOfTask } = baseTask;
		return { ...restOfTask, displayName: null };
	}

	if (task.anonymousMode) {
		const { requestedByUserId, ...restOfTask } = baseTask;
		return { ...restOfTask, displayName: ownerUsername ?? null };
	}

	return { ...baseTask, displayName: ownerName ?? null };
};
