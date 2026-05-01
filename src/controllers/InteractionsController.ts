import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { z } from "zod";
import { Controller } from "../utils/controller";
import { InteractionsService } from "../services/InteractionsService";
import { sendApiResponse } from "../utils/apiReponse";
import { logger } from "../utils/logger";
import { inject } from "../di";

const interactionParamsSchema = z.object({
  userId: z.string().min(1).meta({ example: "user-001" }),
});

const interactionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

const ratingSchema = z
  .object({
    id: z.number().int().positive(),
    createdAt: z.string().datetime(),
    taskAssignmentId: z.number().int().positive(),
    writtenByUserId: z.string(),
    receivedByUserId: z.string(),
    stars: z.number().int().min(1).max(5),
    comment: z.string().nullable(),
  })
  .meta({ ref: "InteractionRating" });

const interactionItemSchema = z
  .object({
    interactionId: z.number().int().positive(),
    taskAssignmentId: z.number().int().positive(),
    date: z.string().datetime(),
    summary: z.string().nullable(),
    rating: ratingSchema.nullable(),
  })
  .meta({ ref: "InteractionItem" });

const interactionsDataSchema = z
  .object({
    data: z.array(interactionItemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  })
  .meta({ ref: "InteractionsData" });

const interactionsApiResponseSchema = z
  .object({
    data: interactionsDataSchema.nullable(),
    message: z.string().optional(),
    notFound: z.boolean(),
    isUnauthorized: z.boolean(),
    isServerError: z.boolean(),
    isClientError: z.boolean(),
    app: z.object({
      url: z.string().optional(),
    }),
    statusCode: z.number().int(),
  })
  .meta({ ref: "InteractionsApiResponse" });

@Controller("/users")
export class InteractionsController {
  constructor(
    @inject(InteractionsService)
    private readonly interactionsService: InteractionsService,
  ) { }

  controller = new Hono().get(
    "/:userId/interactions",
    describeRoute({
      tags: ["Interactions"],
      summary: "Get user interaction history",
      description:
        "Returns paginated interaction history for a user, including the rating they received for each task assignment when available.",
      responses: {
        200: {
          description: "Interactions fetched successfully",
          content: {
            "application/json": {
              schema: resolver(interactionsApiResponseSchema),
            },
          },
        },
        400: {
          description: "Invalid parameters",
          content: {
            "application/json": {
              schema: resolver(interactionsApiResponseSchema),
            },
          },
        },
        500: {
          description: "Internal server error",
          content: {
            "application/json": {
              schema: resolver(interactionsApiResponseSchema),
            },
          },
        },
      },
    }),
    validator("param", interactionParamsSchema),
    validator("query", interactionsQuerySchema),
    async (c) => {
      try {
        const { userId } = c.req.valid("param");
        const { page, limit } = c.req.valid("query");

        const result = await this.interactionsService.getInteractionsForUser(
          userId,
          page,
          limit,
        );

        if (result.status === 400) {
          return sendApiResponse(c, null, {
            kind: "clientError",
            message: result.body.error,
          });
        }

        return sendApiResponse(c, result.body);
      } catch (err) {
        logger.exception(err);
        return sendApiResponse(c, null, { kind: "serverError" });
      }
    },
  );
}
