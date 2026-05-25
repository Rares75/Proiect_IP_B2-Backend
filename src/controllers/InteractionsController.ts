import { Hono } from "hono";
import { describeRoute, resolver } from "hono-openapi";
import { z } from "zod";
import { inject } from "../di";
import { InteractionsService } from "../services/InteractionsService";
import { sendApiResponse } from "../utils/apiReponse";
import { logger } from "../utils/logger";
import { Controller } from "../utils/controller";

const anonymizedUserSchema = z
  .object({
    id: z.string(),
    alias: z.string(),
    isIdentityHidden: z.boolean(),
  })
  .meta({ ref: "AnonymizedUser" });

const interactionRatingSchema = z
  .object({
    id: z.number().int(),
    createdAt: z.string().datetime(),
    taskAssignmentId: z.number().int(),
    stars: z.number().int(),
    comment: z.string().nullable(),
    writtenBy: anonymizedUserSchema,
    receivedBy: anonymizedUserSchema,
  })
  .meta({ ref: "InteractionRating" });

const interactionSchema = z
  .object({
    interactionId: z.number().int(),
    taskAssignmentId: z.number().int(),
    date: z.string().datetime(),
    summary: z.string().nullable(),
    rating: interactionRatingSchema.nullable(),
  })
  .meta({ ref: "InteractionItem" });

const paginatedInteractionsSchema = z
  .object({
    data: z.array(interactionSchema),
    total: z.number().int(),
    page: z.number().int(),
    limit: z.number().int(),
    totalPages: z.number().int(),
  })
  .meta({ ref: "PaginatedInteractions" });

const interactionsResponseSchema = z
  .object({
    data: paginatedInteractionsSchema,
    message: z.string(),
    notFound: z.boolean(),
    isUnauthorized: z.boolean(),
    isServerError: z.boolean(),
    isClientError: z.boolean(),
    app: z.object({ url: z.string() }),
    statusCode: z.number().int(),
  })
  .meta({ ref: "InteractionsResponse" });

const errorResponseSchema = z
  .object({
    data: z.null(),
    message: z.string(),
    notFound: z.boolean(),
    isUnauthorized: z.boolean(),
    isServerError: z.boolean(),
    isClientError: z.boolean(),
    app: z.object({ url: z.string() }),
    statusCode: z.number().int(),
  })
  .meta({ ref: "InteractionsErrorResponse" });

@Controller("/users")
export class InteractionsController {
  constructor(
    @inject(InteractionsService)
    private readonly interactionsService: InteractionsService,
  ) {}

  controller = new Hono().get(
    "/:userId/interactions",
    describeRoute({
      tags: ["Interactions"],
      summary: "Get paginated interactions for a user",
      description:
        "Retrieve the interaction history for a user and include the anonymized rating attached to each task assignment when available.",
      parameters: [
        {
          name: "userId",
          in: "path",
          required: true,
          description: "ID of the user to fetch interactions for",
          schema: { type: "string", example: "user456" },
        },
        {
          name: "page",
          in: "query",
          required: false,
          description: "Page number to retrieve, starting at 1",
          schema: { type: "integer", minimum: 1, example: 1 },
        },
        {
          name: "limit",
          in: "query",
          required: false,
          description: "Number of interactions per page, max 100",
          schema: { type: "integer", minimum: 1, maximum: 100, example: 10 },
        },
      ],
      responses: {
        200: {
          description: "Paginated interactions for the user",
          content: {
            "application/json": {
              schema: resolver(interactionsResponseSchema),
            },
          },
        },
        400: {
          description: "Invalid pagination parameters",
          content: {
            "application/json": {
              schema: resolver(errorResponseSchema),
            },
          },
        },
        500: {
          description: "Server error",
          content: {
            "application/json": {
              schema: resolver(errorResponseSchema),
            },
          },
        },
      },
    }),
    async (c) => {
      try {
        const userId = c.req.param("userId");
        const page = Number(c.req.query("page") ?? 1);
        const limit = Number(c.req.query("limit") ?? 10);

        if (
          Number.isNaN(page) ||
          page < 1 ||
          Number.isNaN(limit) ||
          limit < 1 ||
          limit > 100
        ) {
          return sendApiResponse(c, null, {
            kind: "clientError",
            message: "Invalid pagination parameters.",
          });
        }

        const result = await this.interactionsService.getInteractionsForUser(
          userId,
          page,
          limit,
        );

        return sendApiResponse(c, result.body);
      } catch (err) {
        logger.exception(err);
        return sendApiResponse(c, null, { kind: "serverError" });
      }
    },
  );
}
