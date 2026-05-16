import type { DatabaseClient } from "../../db/repositories/databaseClient";
import type { HelpRequest } from "../../db/repositories/helpRequest.repository";

export type NotificationDbClient = DatabaseClient;

export type NewRequestNotificationContext = Pick<HelpRequest, "id" | "title">;

export type OfferReceivedNotificationContext = {
	helpRequestId: number;
	title: string;
	ownerUserId: string;
};

export type OfferAcceptedNotificationContext = {
	helpRequestId: number;
	taskAssignmentId: number;
	title: string;
	volunteerUserId: string;
};
