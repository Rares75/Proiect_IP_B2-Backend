type TaskSocketRole = "owner" | "volunteer";

type TaskSocketEntry = {
	ownerSocket: Bun.ServerWebSocket<unknown> | null;
	volunteerSocket: Bun.ServerWebSocket<unknown> | null;
};

type TaskSocketRegistration = {
	taskId: number;
	role: TaskSocketRole;
	socket: Bun.ServerWebSocket<unknown>;
};

class TaskConversationConnections {
	private readonly connectionsByTask = new Map<number, TaskSocketEntry>();

	register({ taskId, role, socket }: TaskSocketRegistration) {
		const existing = this.connectionsByTask.get(taskId) ?? {
			ownerSocket: null,
			volunteerSocket: null,
		};

		if (role === "owner") {
			existing.ownerSocket = socket;
		} else {
			existing.volunteerSocket = socket;
		}

		this.connectionsByTask.set(taskId, existing);
	}

	remove(
		taskId: number,
		role: TaskSocketRole,
		socket: Bun.ServerWebSocket<unknown>,
	) {
		const existing = this.connectionsByTask.get(taskId);
		if (!existing) {
			return;
		}

		if (role === "owner" && existing.ownerSocket === socket) {
			existing.ownerSocket = null;
		}

		if (role === "volunteer" && existing.volunteerSocket === socket) {
			existing.volunteerSocket = null;
		}

		if (!existing.ownerSocket && !existing.volunteerSocket) {
			this.connectionsByTask.delete(taskId);
			return;
		}

		this.connectionsByTask.set(taskId, existing);
	}

	getPeerSocket(
		taskId: number,
		role: TaskSocketRole,
	): Bun.ServerWebSocket<unknown> | null {
		const existing = this.connectionsByTask.get(taskId);
		if (!existing) {
			return null;
		}

		return role === "owner" ? existing.volunteerSocket : existing.ownerSocket;
	}
}

export const taskConversationConnections = new TaskConversationConnections();

export type { TaskSocketRole };
