import { Hono } from "hono";
import { Controller } from "../utils/controller";
import { authMiddlware } from "../middlware/authMiddleware";
import { sendApiResponse } from "../utils/apiReponse";
import { logger } from "../utils/logger";
import { BecomeVolunteerService } from "../services/BecomeVolunteerService";
import { inject } from "../di";
import { NotFoundError } from "../utils/Errors";
import { becomeVolunteerDocs } from "../docs/become-volunteer.docs";
import { VolunteerException } from "../exceptions/volunteer/VolunteerException";

@Controller("/users")
export class BecomeVolunteerController {
	constructor(
		@inject(BecomeVolunteerService)
		private readonly becomeVolunteerService: BecomeVolunteerService,
	) {}

	controller = new Hono()
		.use(authMiddlware)
		.post("/become-volunteer", becomeVolunteerDocs, async (c) => {
			const session = c.get("session");
			if (!session) {
				return sendApiResponse(c, null, { kind: "unauthorized" });
			}

			try {
				const volunteer = await this.becomeVolunteerService.becomeVolunteer(
					session.userId,
				);

				return sendApiResponse(
					c,
					{
						message: "You are now a volunteer",
						volunteer,
					},
					{ kind: "created" },
				);
			} catch (error: unknown) {
				if (error instanceof VolunteerException) {
					return sendApiResponse(c, null, {
						kind: "clientError",
						statusCode: 409,
						message: "User is already a volunteer",
					});
				}
				if (error instanceof NotFoundError) {
					return sendApiResponse(c, null, { kind: "notFound" });
				}
				logger.exception(error);
				return sendApiResponse(c, null, { kind: "serverError" });
			}
		});
}
