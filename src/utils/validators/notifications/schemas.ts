import { z } from "zod";

export const notificationsQuerySchema = z.object({
	page: z.coerce.number().int().positive().optional().default(1),
	pageSize: z.coerce.number().int().positive().max(50).optional().default(20),
	unreadOnly: z.enum(["true", "false"]).optional(),
});

export const notificationParamSchema = z.object({
	id: z.coerce.number().int().positive("ID-ul trebuie să fie un număr pozitiv"),
});
