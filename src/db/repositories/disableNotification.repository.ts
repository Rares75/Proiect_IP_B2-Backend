import { and, count as drizzleCount, eq } from "drizzle-orm";
import { db } from "../../db";
import { repository } from "../../di/decorators/repository";
import { disableNotifications } from "../social";
import type { IRepository } from "./base.repository";

export type DisableNotification = typeof disableNotifications.$inferSelect;
export type CreateDisableNotificationDTO =
	typeof disableNotifications.$inferInsert;
export type UpdateDisableNotificationDTO =
	Partial<CreateDisableNotificationDTO>;

@repository()
export class DisableNotificationRepository
	implements
		IRepository<
			DisableNotification,
			CreateDisableNotificationDTO,
			UpdateDisableNotificationDTO,
			number
		>
{
	async create(
		data: CreateDisableNotificationDTO,
	): Promise<DisableNotification> {
		const [created] = await db
			.insert(disableNotifications)
			.values(data)
			.returning();
		return created;
	}

	async findById(id: number): Promise<DisableNotification | undefined> {
		const [found] = await db
			.select()
			.from(disableNotifications)
			.where(eq(disableNotifications.id, id));
		return found;
	}

	async update(
		id: number,
		data: UpdateDisableNotificationDTO,
	): Promise<DisableNotification | undefined> {
		const [updated] = await db
			.update(disableNotifications)
			.set(data)
			.where(eq(disableNotifications.id, id))
			.returning();
		return updated;
	}

	async delete(id: number): Promise<boolean> {
		const result = await db
			.delete(disableNotifications)
			.where(eq(disableNotifications.id, id))
			.returning({ id: disableNotifications.id });
		return result.length > 0;
	}

	async exists(id: number): Promise<boolean> {
		const [{ value }] = await db
			.select({ value: drizzleCount() })
			.from(disableNotifications)
			.where(eq(disableNotifications.id, id));
		return value > 0;
	}

	async findFirstBy(
		criteria: Partial<DisableNotification>,
	): Promise<DisableNotification | undefined> {
		const conditions = [];

		for (const [key, value] of Object.entries(criteria)) {
			if (value !== undefined) {
				const column =
					disableNotifications[key as keyof typeof disableNotifications];
				conditions.push(eq(column as any, value));
			}
		}

		if (conditions.length === 0) return undefined;

		const [found] = await db
			.select()
			.from(disableNotifications)
			.where(and(...conditions))
			.limit(1);
		return found;
	}

	async findMany(
		limit: number = 50,
		offset: number = 0,
	): Promise<DisableNotification[]> {
		return await db
			.select()
			.from(disableNotifications)
			.limit(limit)
			.offset(offset);
	}

	async count(): Promise<number> {
		const [{ value }] = await db
			.select({ value: drizzleCount() })
			.from(disableNotifications);
		return value;
	}

	/**
	 * Returns all disable notification logs for a given user, ordered by newest first.
	 */
	async findAllByUserId(userId: string): Promise<DisableNotification[]> {
		return await db
			.select()
			.from(disableNotifications)
			.where(eq(disableNotifications.userId, userId))
			.orderBy(disableNotifications.notifiedAt);
	}

	/**
	 * Returns the most recent disable notification for a user.
	 */
	async findLatestByUserId(
		userId: string,
	): Promise<DisableNotification | undefined> {
		const [found] = await db
			.select()
			.from(disableNotifications)
			.where(eq(disableNotifications.userId, userId))
			.orderBy(disableNotifications.notifiedAt)
			.limit(1);
		return found;
	}

	/**
	 * Checks if a notification already exists for this user with this exact reason
	 * (used to prevent duplicate notifications).
	 */
	async notificationExistsForReason(
		userId: string,
		reason: string,
	): Promise<boolean> {
		const [{ value }] = await db
			.select({ value: drizzleCount() })
			.from(disableNotifications)
			.where(
				and(
					eq(disableNotifications.userId, userId),
					eq(disableNotifications.reason, reason),
				),
			);
		return value > 0;
	}
}