import { Hono } from "hono";
import type { Context } from "hono";
import { upgradeWebSocket } from "hono/bun";
import { Controller } from "../utils/controller";
import { inject } from "../di";
import { NotificationRepository } from "../db/repositories/notification.repository";
import { NotificationService } from "../services/NotificationService";
import { z } from "zod";
import { describeRoute, validator as zValidator } from "hono-openapi";

// --- SCHEME PENTRU DOCUMENTAȚIA SWAGGER ---

const notificationsQuerySchema = z.object({
	page: z.coerce.number().int().positive().optional().default(1),
	pageSize: z.coerce.number().int().positive().max(50).optional().default(20),
	unreadOnly: z.enum(["true", "false"]).optional(),
});

const notificationParamSchema = z.object({
	id: z.coerce.number().int().positive("ID-ul trebuie să fie un număr pozitiv"),
});

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
			describeRoute({
				summary: "Listează notificările utilizatorului sau guest-ului",
				description:
					"Returnează notificările paginate. Suportă filtrare după unreadOnly.",
				tags: ["Notifications"],
				responses: {
					200: { description: "Lista paginată de notificări și unreadCount" },
					401: {
						description: "Neautorizat (lipsește sesiunea sau X-Guest-Session)",
					},
				},
			}),
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
		.patch(
			"/read-all",
			describeRoute({
				summary: "Marchează toate notificările ca citite",
				description:
					"Setează readAt la momentul curent pentru toate notificările necitite.",
				tags: ["Notifications"],
				responses: {
					200: { description: "Numărul de notificări actualizate" },
					401: { description: "Neautorizat" },
				},
			}),
			async (c) => {
				const { userId, guestSessionId } = this.getIdentity(c);

				if (!userId && !guestSessionId) {
					return c.json({ error: "Unauthorized" }, 401);
				}

				const count = await this.notificationRepo.markAllAsRead({
					userId,
					guestSessionId,
				});
				return c.json({ updatedCount: count }, 200);
			},
		)

		// 3. PATCH /api/notifications/:id/read - Marchează una ca citită
		.patch(
			"/:id/read",
			describeRoute({
				summary: "Marchează o singură notificare ca citită",
				description:
					"Setează readAt la momentul curent pentru notificarea specificată.",
				tags: ["Notifications"],
				responses: {
					200: { description: "Notificarea a fost actualizată" },
					400: { description: "ID invalid" },
					401: { description: "Neautorizat" },
					403: { description: "Interzis - nu deții această notificare" },
					404: { description: "Notificarea nu a fost găsită" },
				},
			}),
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
			describeRoute({
				summary: "Conexiune WebSocket pentru notificări real-time",
				description:
					"Nu se apelează via REST (Swagger). Conectați-vă cu un client WS. Dacă sunteți guest, folosiți parametrul de query ?guestSessionId=...",
				tags: ["Notifications"],
			}),
			upgradeWebSocket((c) => {
				return {
					onOpen: async (_event, ws) => {
						const session = c.get("session") as any;
						const userId = session?.user?.id || session?.userId || session?.id;
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
						const userId = session?.user?.id || session?.userId || session?.id;
						const guestSessionId = c.req.query("guestSessionId");
						const key = userId || guestSessionId;

						if (key) this.notificationService.notificationSockets.delete(key);
					},
				};
			}),
		);
}
