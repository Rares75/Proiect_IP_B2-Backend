import { describeRoute } from "hono-openapi";

export const getNotificationsDocs = describeRoute({
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
});

export const markAllNotificationsReadDocs = describeRoute({
	summary: "Marchează toate notificările ca citite",
	description:
		"Setează readAt la momentul curent pentru toate notificările necitite.",
	tags: ["Notifications"],
	responses: {
		200: { description: "Numărul de notificări actualizate" },
		401: { description: "Neautorizat" },
	},
});

export const markNotificationReadDocs = describeRoute({
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
});

export const notificationWebsocketDocs = describeRoute({
	summary: "Conexiune WebSocket pentru notificări real-time",
	description:
		"Nu se apelează via REST (Swagger). Conectați-vă cu un client WS. Dacă sunteți guest, folosiți parametrul de query ?guestSessionId=...",
	tags: ["Notifications"],
});
