import { z } from "zod";
import { optionalCoercedNumber } from "./queryParams.schema";

export const notificationsQuerySchema = z.object({
	page: optionalCoercedNumber("Page must be a number")
		.refine((value) => value === undefined || value > 0, {
			message: "Page must be greater than 0",
		})
		.default(1),
	pageSize: optionalCoercedNumber("Page size must be a number")
		.refine((value) => value === undefined || value > 0, {
			message: "Page size must be greater than 0",
		})
		.refine((value) => value === undefined || value <= 50, {
			message: "Page size must be less than or equal to 50",
		})
		.default(20),
	unreadOnly: z.preprocess((value) => value === "true", z.boolean()).optional(),
});
