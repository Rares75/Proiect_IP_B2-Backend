import { Hono } from "hono";
import { Controller } from "../utils/controller";
import { helpRequestService } from "../services/HelpRequestService";
import { Controller } from "../utils/Controller";
import { helpRequestService } from "@server/services/HelpRequestService";
import {RequestStatus, RequestStatusType} from "@server/db/schema";
import {InvalidStatusTransitionError, NotFoundError} from "@server/utils/Errors";

const VALID_STATUSES = new Set<RequestStatusType>(RequestStatus.enumValues);    //["OPEN", "MATCHED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "REJECTED"]

@Controller("/tasks")
export class HelpRequestController {
  static controller = new Hono()
    .post("/", async (c) => {
      try {
        const body = await c.req.json();
        const result = await helpRequestService.createHelpRequest(body);
        return c.json(result, 201);
      } catch (error) {
        return c.json({ message: "Internal server error" }, 500);
      }
      const body = await c.req.json();
      const result = await helpRequestService.createHelpRequest(body);
      return c.json(result, 201);
    })
      .post("/:id/status", async(c) => {
          const {id} = c.req.param();

          let body: { status?: unknown };
          try {
              body = await c.req.json();
          } catch {
              return c.json({error: "Request body must be valid JSON"}, 400);
          }

          const {status} = body;

          if (typeof status !== "string" || !VALID_STATUSES.has(status as RequestStatusType)) {
              return c.json(
                  {error: `'status' must be one of: ${[...VALID_STATUSES].join(", ")}`},
                  400
              );
          }

          try {
              const updated = await helpRequestService.updateHelpRequestStatus(id, status as RequestStatusType);
              return c.json(updated, 200);
          } catch (error) {
              if (error instanceof NotFoundError) {
                  return c.json({error: error.message}, 404);
              } else if (error instanceof InvalidStatusTransitionError) {
                  return c.json({error: error.message}, 400);
              }
              throw error;
          }
    });
}