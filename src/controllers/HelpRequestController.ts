import {Hono} from "hono";
import {Controller} from "../utils/controller";
import {inject} from "../di";
import {HelpRequestService} from "../services/HelpRequestService";
import {requestStatusEnum} from "../db/enums";
import {InvalidStatusTransitionError, NotFoundError} from "../utils/Errors";

import {authMiddleware} from "../middlware/authMiddleware";
import {validateTasksQuery} from "../utils/validators/queryValidator";

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
    ) {
    }

    controller = new Hono()
        .use("/", createValidationMiddleware(helpRequestInputSchema))

        .post("/", async (c) => {
            try {
                const body = await c.req.json();
                const result = await this.helpRequestService.createHelpRequest(body);
                return c.json(result, 201);
            } catch {
                return c.json({error: "Internal server error"}, 500);
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
                            error:
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
                            error: `Eroare: Task-ul cu ID-ul '${requestedId}' nu exista in sistem.`,
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
                        error:
                            "Eroare interna a serverului. Va rugam incercati mai tarziu.",
                    },
                    500,
                );
            }
        })

        .patch("/:id/status", async (c) => {
            const requestId = Number(c.req.param("id"));
            if (!Number.isInteger(requestId)) {
                return c.json(
                    {error: "'id' must be a valid numeric request identifier"},
                    400,
                );
            }

            let body: { status?: unknown };
            try {
                body = await c.req.json();
            } catch {
                return c.json({error: "Request body must be valid JSON"}, 400);
            }

            const {status} = body;

            if (
                typeof status !== "string" ||
                !VALID_STATUSES.has(status as RequestStatus)
            ) {
                return c.json(
                    {
                        error: `'status' must be one of: ${[...VALID_STATUSES].join(", ")}`,
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
                    return c.json({error: error.message}, 404);
                }

                if (error instanceof InvalidStatusTransitionError) {
                    return c.json({error: error.message}, 409);
                }

                throw error;
            }
        })

        // BE1-12 & BE1-13 (Paginare + Sortare)
        .get("/", authMiddleware, async (c) => {
            try {
                //Apelam validatorul nostru curat, trimitându-i toți parametrii din URL
                //UPDATE: acum valideaza si cu skill filters, care pot fi multiple (@ClsnDm)
                const validation = validateTasksQuery(c.req.query(), c.req.queries("skill"));

                //Daca validatorul gaseste o problema
                if (validation.error || !validation.validData) {
                    return c.json(
                        {error: validation.error || "Eroare de validare."},
                        400,
                    );
                }

                //Extragem parametrii
                const {page, pageSize, sortBy, order, filters} = validation.validData;
                const result = await this.helpRequestService.getPaginatedTasks(
                    page,
                    pageSize,
                    sortBy,
                    order,
                    filters,
                );

                return c.json(result, 200);
            } catch (error) {
                console.error("Eroare la GET /tasks paginat si sortat:", error);
                return c.json({error: "Eroare interna a serverului."}, 500);
            }
        });
}
