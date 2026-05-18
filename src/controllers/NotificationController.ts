import { Hono } from "hono";
import type { Context } from "hono";
import { upgradeWebSocket } from "hono/bun";
import { Controller } from "../utils/controller";
import { inject } from "../di";
import { NotificationRepository } from "../db/repositories/notification.repository";
import { NotificationService } from "../services/NotificationService";
import { validator as zValidator } from "hono-openapi";
import {
	getNotificationsDocs,
	markAllNotificationsReadDocs,
	markNotificationReadDocs,
	notificationWebsocketDocs,
} from "../docs/notification.docs";
import {
	notificationParamSchema,
	notificationsQuerySchema,
} from "../utils/validators/notifications/schemas";

@Controller("/notifications")
export class NotificationController {
	constructor(
		@inject(NotificationService)
		private readonly notificationService: NotificationService,
		@inject(NotificationRepository)
		private readonly notificationRepo: NotificationRepository,
	) {}

	/**
	 * Extrage userId sau guestSessionId din request.
	 */
	private getIdentity(c: Context) {
		const session = c.get("session") as any;
		const userId = session?.user?.id || session?.userId || session?.id;
		const guestSessionId = c.req.header("X-Guest-Session");
		return { userId, guestSessionId };
	}

	controller = new Hono()
		// 1. GET /api/notifications - Listare paginată
		.get(
			"/",
			getNotificationsDocs,
			zValidator("query", notificationsQuerySchema),
			async (c) => {
				const { userId, guestSessionId } = this.getIdentity(c);

				if (!userId && !guestSessionId) {
					return c.json({ error: "Unauthorized" }, 401);
				}

				// Extragem datele validate de Zod
				const { page, pageSize, unreadOnly } = c.req.valid("query");
				const isUnread = unreadOnly === "true";

				const result = await this.notificationRepo.findPaginated(
					{ userId, guestSessionId },
					page,
					pageSize,
					isUnread,
				);

				const totalPages = Math.ceil(result.total / pageSize);

				return c.json(
					{
						data: result.data,
						meta: {
							page,
							pageSize,
							total: result.total,
							totalPages,
							unreadCount: result.unreadCount,
						},
					},
					200,
				);
			},
		)

		// 2. PATCH /api/notifications/read-all - Marchează toate ca citite
		.patch("/read-all", markAllNotificationsReadDocs, async (c) => {
			const { userId, guestSessionId } = this.getIdentity(c);

			if (!userId && !guestSessionId) {
				return c.json({ error: "Unauthorized" }, 401);
			}

			const count = await this.notificationRepo.markAllAsRead({
				userId,
				guestSessionId,
			});
			return c.json({ updatedCount: count }, 200);
		})

		// 3. PATCH /api/notifications/:id/read - Marchează una ca citită
		.patch(
			"/:id/read",
			markNotificationReadDocs,
			zValidator("param", notificationParamSchema),
			async (c) => {
				const { userId, guestSessionId } = this.getIdentity(c);

				if (!userId && !guestSessionId) {
					return c.json({ error: "Unauthorized" }, 401);
				}

				const { id } = c.req.valid("param");

				const notification = await this.notificationRepo.findById(id);
				if (!notification) {
					return c.json({ error: "Notification not found" }, 404);
				}

				const isOwner =
					(userId && notification.userId === userId) ||
					(guestSessionId && notification.guestSessionId === guestSessionId);

				if (!isOwner) {
					return c.json(
						{ error: "Forbidden: You don't own this notification" },
						403,
					);
				}

				const updated = await this.notificationRepo.markAsRead(id);
				return c.json(updated, 200);
			},
		)

		// 4. GET /api/notifications/ws - Conexiunea WebSocket
		.get(
			"/ws",
			notificationWebsocketDocs,
			upgradeWebSocket((c) => {
				return {
					onOpen: async (_event, ws) => {
						const session = c.get("session") as any;
						const userId = session?.user?.id || session?.userId;
						const guestSessionId = c.req.query("guestSessionId");

						const key = userId || guestSessionId;
						if (!key) {
							ws.close(1008, "Unauthorized");
							return;
						}

						this.notificationService.notificationSockets.set(key, ws);

						try {
							const unread = await this.notificationRepo.findPaginated(
								{ userId, guestSessionId },
								1,
								50,
								true,
							);

							for (const notif of unread.data) {
								ws.send(JSON.stringify({ type: "NOTIFICATION", data: notif }));
							}
						} catch (error) {
							console.error("WS Burst error:", error);
						}
					},
					onClose: (_event, _ws) => {
						const session = c.get("session") as any;
						const userId = session?.user?.id || session?.userId;
						const guestSessionId = c.req.query("guestSessionId");
						const key = userId || guestSessionId;

						if (key) this.notificationService.notificationSockets.delete(key);
					},
				};
			}),
		);
}
