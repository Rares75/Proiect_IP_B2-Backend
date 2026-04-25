import { Hono } from "hono";
import { Controller } from "../utils/controller";
import { inject } from "../di";
import { HelpRequestService } from "../services/HelpRequestService";
import { requestStatusEnum } from "../db/enums";
import { InvalidStatusTransitionError, NotFoundError } from "../utils/Errors";

import { authMiddleware } from "../middlware/authMiddleware";

type RequestStatus = (typeof requestStatusEnum.enumValues)[number];

const VALID_STATUSES = new Set<RequestStatus>(requestStatusEnum.enumValues);
import {
	createValidationMiddleware,
	helpRequestInputSchema,
} from "../validation";

@Controller("/tasks")
export class HelpRequestController {
	constructor(
		@inject(HelpRequestService)
		private readonly helpRequestService: HelpRequestService,
	) {}

	controller = new Hono()
		.use("/", createValidationMiddleware(helpRequestInputSchema))
		
		.post("/", async (c) => {
				try {
					const body = await c.req.json();
					const result = await this.helpRequestService.createHelpRequest(body);
					return c.json(result, 201);
				} catch {
					return c.json({ message: "Internal server error" }, 500);
			}
		})

		.get("/:id", async (c) => {
			try {
				const idParam = c.req.param("id");
				const requestedId = Number(idParam);

				if (
					!Number.isInteger(requestedId) ||
					requestedId <= 0 ||
					requestedId > Number.MAX_SAFE_INTEGER
				) {
					return c.json(
						{
							message:
								"Eroare: ID-ul furnizat este invalid. Trebuie sa fie un numar intreg pozitiv.",
						},
						400,
					);
				}

				const foundTask =
					await this.helpRequestService.getHelpRequestById(requestedId);

				if (
					!foundTask ||
					(Array.isArray(foundTask) && foundTask.length === 0)
				) {
					return c.json(
						{
							message: `Eroare: Task-ul cu ID-ul '${requestedId}' nu exista in sistem.`,
						},
						404,
					);
				}

				const dataToReturn = Array.isArray(foundTask)
					? foundTask[0]
					: foundTask;
				return c.json(dataToReturn, 200);
			} catch (error) {
				console.error(
					`Eroare critica la GET /tasks/${c.req.param("id")} :`,
					error,
				);
				return c.json(
					{
						message:
							"Eroare interna a serverului. Va rugam incercati mai tarziu.",
					},
					500,
				);
			}
		})

		.post("/:id/status", async (c) => {
			const requestId = Number(c.req.param("id"));
			if (!Number.isInteger(requestId)) {
				return c.json(
					{ message: "'id' must be a valid numeric request identifier" },
					400,
				);
			}

			let body: { status?: unknown };
			try {
				body = await c.req.json();
			} catch {
				return c.json({ message: "Request body must be valid JSON" }, 400);
			}

			const { status } = body;

			if (
				typeof status !== "string" ||
				!VALID_STATUSES.has(status as RequestStatus)
			) {
				return c.json(
					{
						message: `'status' must be one of: ${[...VALID_STATUSES].join(", ")}`,
					},
					400,
				);
			}

			try {
				const updated = await this.helpRequestService.updateHelpRequestStatus(
					requestId,
					status as RequestStatus,
				);
				return c.json(updated, 200);
			} catch (error) {
				if (error instanceof NotFoundError) {
					return c.json({ message: error.message }, 404);
				}

				if (error instanceof InvalidStatusTransitionError) {
					return c.json({ message: error.message }, 400);
				}
        
        throw error;
      }
    })
  

    //BE1-12
    .get("/", authMiddleware, async (c) => {
      try {
        const pageParam = c.req.query("page");
        const pageSizeParam = c.req.query("pageSize");

        const page = pageParam ? Number(pageParam) : 1;
        const pageSize = pageSizeParam ? Number(pageSizeParam) : 10;

        if (!Number.isInteger(page) || page < 1) {
            return c.json({ error: "Eroare: 'page' trebuie sa fie minim 1." }, 400);
        }

        if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
            return c.json({ error: "Eroare: 'pageSize' trebuie sa fie intre 1 si 100." }, 400);
        }

        const result = await this.helpRequestService.getPaginatedTasks(page, pageSize);

        return c.json(result, 200);
      } catch (error) {
        console.error("Eroare la GET /tasks paginat:", error);
        return c.json({ error: "Eroare interna a serverului." }, 500);
      }
    });

}
