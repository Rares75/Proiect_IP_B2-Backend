import { z } from "zod";

const allowedSortFields = ["createdAt", "urgency"] as const;
const allowedOrderValues = ["ASC", "DESC"] as const;
const allowedRequestStatuses = [
	"OPEN",
	"MATCHED",
	"IN_PROGRESS",
	"COMPLETED",
	"CANCELLED",
	"REJECTED",
] as const;

const optionalCoercedNumber = (message: string) =>
	z.preprocess((value) => {
		if (typeof value !== "string") {
			return value;
		}

		const trimmedValue = value.trim();
		return trimmedValue === "" ? Number.NaN : trimmedValue;
	}, z.coerce.number({ error: message }).optional());

const skillSchema = z
	.preprocess((value) => {
		if (value === undefined) {
			return undefined;
		}

		return Array.isArray(value) ? value : [value];
	}, z.array(z.string()).optional())
	.refine(
		(skills) =>
			skills === undefined || skills.every((skill) => skill.trim().length > 0),
		{
			message: "Skill must not be empty",
		},
	);

export const queryParamsSchema = z
	.object({
		page: optionalCoercedNumber("Page must be a number"),
		pageSize: optionalCoercedNumber("Page size must be a number")
			.refine((value) => value === undefined || value > 0, {
				message: "Page size must be greater than 0",
			})
			.refine((value) => value === undefined || value <= 100, {
				message: "Page size must be less than or equal to 100",
			}),
		sortBy: z
			.enum(allowedSortFields, {
				message: `Sort by must be one of: ${allowedSortFields.join(", ")}`,
			})
			.optional(),
		order: z
			.enum(allowedOrderValues, {
				message: "Order must be either ASC or DESC",
			})
			.optional(),
		status: z
			.enum(allowedRequestStatuses, {
				message: "Status must be a valid request status",
			})
			.optional(),
		city: z.string().trim().min(1, "City must not be empty").optional(),
		language: z
			.string()
			.trim()
			.min(1, "Language must not be empty")
			.max(50, "Language must be at most 50 characters")
			.optional(),
		skill: skillSchema,
		lat: optionalCoercedNumber("Latitude must be a number").refine(
			(value) => value === undefined || (value >= -90 && value <= 90),
			{
				message: "Latitude must be between -90 and 90",
			},
		),
		lng: optionalCoercedNumber("Longitude must be a number").refine(
			(value) => value === undefined || (value >= -180 && value <= 180),
			{
				message: "Longitude must be between -180 and 180",
			},
		),
		radius: optionalCoercedNumber("Radius must be a number").refine(
			(value) => value === undefined || value > 0,
			{
				message: "Radius must be greater than 0",
			},
		),
	})
	.superRefine((data, context) => {
		if (data.lat !== undefined && data.lng === undefined) {
			context.addIssue({
				code: "custom",
				path: ["lng"],
				message: "Longitude is required when latitude is provided",
			});
		}
	});
