import { and, count, desc, eq, isNull } from "drizzle-orm";
import { db } from "../";
import { repository } from "../../di/decorators/repository";
import { userAccesses, volunteers } from "../profile";
import { notifications } from "../social";
import type { DatabaseClient } from "./databaseClient";

export type Notification = typeof notifications.$inferSelect;
export type CreateNotificationDTO = typeof notifications.$inferInsert;

export type NewRequestNotificationRecipient = {
	userId: string;
};

@repository()
export class NotificationRepository {
	async findEligibleNewRequestRecipients(): Promise<
		NewRequestNotificationRecipient[]
	> {
		// TODO: add skill matching using volunteer_profiles.skills and helpRequests.skillsNeeded
		// TODO: add distance matching using volunteer_known_locations, request_locations and ST_DWithin
		return db
			.select({
				userId: volunteers.userId,
			})
			.from(volunteers)
			.innerJoin(userAccesses, eq(userAccesses.userId, volunteers.userId))
			.where(
				and(
					eq(volunteers.availability, true),
					eq(userAccesses.status, "ACTIVE"),
				),
			);
	}

	async create(
		data: CreateNotificationDTO,
		client: DatabaseClient = db,
	): Promise<Notification> {
		// Validare aplicatie: trebuie sa avem macar unul din cei doi
		if (!data.userId && !data.guestSessionId) {
			throw new Error(
				"Cannot create notification: Must provide either userId or guestSessionId",
			);
		}

		const [notification] = await client
			.insert(notifications)
			.values(data)
			.returning();

		return notification;
	}

	async createMany(
		data: CreateNotificationDTO[],
		client: DatabaseClient = db,
	): Promise<Notification[]> {
		if (data.length === 0) {
			return [];
		}

		return client.insert(notifications).values(data).returning();
	}

	// --- METODE NOI PENTRU BE1-50 ---

	/**
	 * Găsește notificările pentru un utilizator (sau guest), cu suport pentru paginare și filtrare
	 */
	async findPaginated(
		identifier: { userId?: string; guestSessionId?: string },
		page: number,
		pageSize: number,
		unreadOnly: boolean = false,
	) {
		const offset = (page - 1) * pageSize;

		// Construim conditia de cautare pe baza identifier-ului (userId sau guestSessionId)
		const userCondition = identifier.userId
			? eq(notifications.userId, identifier.userId)
			: eq(notifications.guestSessionId, identifier.guestSessionId as string);

		// Dacă unreadOnly e true, adăugăm condiția readAt IS NULL
		const filterConditions = unreadOnly
			? and(userCondition, isNull(notifications.readAt))
			: userCondition;

		// Executăm query-ul pentru date, sortat DESC după createdAt
		const data = await db
			.select()
			.from(notifications)
			.where(filterConditions)
			.orderBy(desc(notifications.createdAt))
			.limit(pageSize)
			.offset(offset);

		// Numărăm totalul de notificări (pentru paginare)
		const [{ value: total }] = await db
			.select({ value: count() })
			.from(notifications)
			.where(filterConditions);

		// Indiferent de filtru, calculăm de câte ori apare readAt=null (unreadCount)
		const [{ value: unreadCount }] = await db
			.select({ value: count() })
			.from(notifications)
			.where(and(userCondition, isNull(notifications.readAt)));

		return { data, total, unreadCount };
	}

	/**
	 * Găsește o singură notificare după ID
	 */
	async findById(id: number): Promise<Notification | undefined> {
		const [notification] = await db
			.select()
			.from(notifications)
			.where(eq(notifications.id, id));
		return notification;
	}

	/**
	 * Marchează o anumită notificare ca citită
	 */
	async markAsRead(id: number): Promise<Notification | undefined> {
		const [updated] = await db
			.update(notifications)
			.set({ readAt: new Date() })
			.where(eq(notifications.id, id))
			.returning();
		return updated;
	}

	/**
	 * Marchează TOATE notificările necitite ale unui utilizator (sau guest) ca fiind citite
	 */
	async markAllAsRead(identifier: {
		userId?: string;
		guestSessionId?: string;
	}): Promise<number> {
		const userCondition = identifier.userId
			? eq(notifications.userId, identifier.userId)
			: eq(notifications.guestSessionId, identifier.guestSessionId as string);

		const updatedRows = await db
			.update(notifications)
			.set({ readAt: new Date() })
			.where(and(userCondition, isNull(notifications.readAt)))
			.returning({ id: notifications.id });

		return updatedRows.length; // returnăm numărul de notificări actualizate
	}
}
