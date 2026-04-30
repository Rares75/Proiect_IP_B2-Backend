import { rateLimitSchema } from "better-auth";
import { InteractionsRepository } from "../db/repositories/interactions.repository";
import { inject } from "../di";
import { Service } from "../di/decorators/service";

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
        body: {
            data: InteractionWithRating[];
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }
    | {
        status: 400;
        body: {
            error: string
        };
    }

@Service()
export class InteractionsService {
    constructor(
        @inject(InteractionsRepository)
        private readonly ratingRepo: InteractionsRepository,
    ) {}

    async getInteractionsForUser(userId: string, page: number = 1, limit: number = 10): Promise<GetInteractionsForUserResponse> {
        if (!userId) {
            return {
                status: 400,
                body: {
                    error: "User ID is required."
                }
            };
        }

        const offset = (page - 1) * limit;

        const [interactions, total] = await Promise.all([
            this.ratingRepo.getInteractionsByUserId(userId, limit, offset),
            this.ratingRepo.countInteractionsByUserId(userId),
        ]);

        const data = await Promise.all(
            interactions.map(async (interaction) => {
                const ratings = await this.ratingRepo.getRatingsByTaskAssignmentId(interaction.taskAssignmentId);
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
            body: {
                data,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
}