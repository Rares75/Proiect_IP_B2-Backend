import { Hono } from "hono";
import { Controller } from "../utils/controller";
import { inject } from "../di";
import { HelpRequestService } from "../services/HelpRequestService";
import { requestStatusEnum } from "../db/enums";
import { InvalidStatusTransitionError, NotFoundError } from "../utils/Errors";


type RequestStatus = (typeof requestStatusEnum.enumValues)[number];

const VALID_STATUSES = new Set<RequestStatus>(requestStatusEnum.enumValues);

@Controller("/tasks")
export class HelpRequestController {
	constructor(
		@inject(HelpRequestService)
		private readonly helpRequestService: HelpRequestService,
	) {}

	controller = new Hono().post("/", async (c) => {
		try {
			const body = await c.req.json();
			const result = await this.helpRequestService.createHelpRequest(body);
			return c.json(result, 201);
		} catch {
			return c.json({ message: "Internal server error" }, 500);
		}
	});
    static controller = new Hono()
        .post("/", async (c) => {
            try {
                const body = await c.req.json();
                const result = await helpRequestService.createHelpRequest(body);
                return c.json(result, 201);
            } catch (error) {
                return c.json({ message: "Internal server error" }, 500);
            }
        })
    .post("/:id/status", async (c) => {
      const requestId = Number(c.req.param("id"));
      if (!Number.isInteger(requestId)) {
        return c.json({ error: "'id' must be a valid numeric request identifier" }, 400);
      }

      let body: { status?: unknown };
      try {
        body = await c.req.json();
      } catch {
        return c.json({ error: "Request body must be valid JSON" }, 400);
      }

      const { status } = body;

      if (typeof status !== "string" || !VALID_STATUSES.has(status as RequestStatus)) {
        return c.json({ error: `'status' must be one of: ${[...VALID_STATUSES].join(", ")}` }, 400);
      }

      try {
        const updated = await helpRequestService.updateHelpRequestStatus(requestId, status as RequestStatus);
        return c.json(updated, 200);
      } catch (error) {
        if (error instanceof NotFoundError) {
          return c.json({ error: error.message }, 404);
        }

        if (error instanceof InvalidStatusTransitionError) {
          return c.json({ error: error.message }, 400);
        }

        throw error;
      }
    });
}
