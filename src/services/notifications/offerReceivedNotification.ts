import type { NotificationRepository } from "../../db/repositories/notification.repository";
import { buildOfferReceivedText } from "./templates";
import type {
    NotificationDbClient,
    OfferReceivedNotificationContext,
} from "./types";

export const notifyOwnerOfferReceived = async (
    notificationRepo: NotificationRepository,
    // Extindem tipul aici ca să evitam erorile de TypeScript
    context: OfferReceivedNotificationContext & { guestSessionId?: string | null },
    client?: NotificationDbClient,
) => { // Nu mai returnam void, ci returnam notificarea
    const notification = await notificationRepo.create(
        {
            // Dacă e guest, ownerUserId va fi null/undefined
            userId: context.ownerUserId ?? null, 
            guestSessionId: context.guestSessionId ?? null,
            type: "NEW_REQUEST", 
            text: buildOfferReceivedText(context.title),
            relatedRequestId: context.helpRequestId,
        },
        client,
    );

    // Returnăm notificarea ca să o prindem în Service pentru WebSocket
    return notification;
};