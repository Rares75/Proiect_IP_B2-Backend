import { InteractionsRepository } from "../repositories/InteractionsRepository";

export type InteractionWithRating = {
    interactionId: number;
    taskAssignmentId: number;
    date: Date;
    summary: string | null;
    rating: {
        id: number;
        createdAt: Date;
        taskAssignmentId: number;
        writtenByUserId: string;
        receivedByUserId: string;
        stars: number;
        comment: string | null;
    } | null;
}

type GetInteractionsForUserResponse =
    | {
        status: 200;
        body: InteractionWithRating[];
    }
    | {
        status: 400;
        body: {
            error: string
        };
    }

export class InteractionsService {
    static async getInteractionsForUser(userId: string): Promise<GetInteractionsForUserResponse> {
        if (!userId) {
            return {
                status: 400,
                body: {
                    error: "User ID is required."
                }
            };
        }

        const interactions = await InteractionsRepository.getInteractionsByUserId(userId);

        const result = await Promise.all(
            interactions.map(async (interaction) => {
                const ratings = await InteractionsRepository.getRatingsByTaskAssignmentId(interaction.taskAssignmentId);
                const receivedRating = ratings.find((rating) => rating.receivedByUserId == userId) ?? null;
                return {
                    interactionId: interaction.id,
                    taskAssignmentId: interaction.taskAssignmentId,
                    date: interaction.date,
                    summary: interaction.summary,
                    rating: receivedRating
                };
            })
        )

        return {
            status: 200,
            body: result
        };
    }
}