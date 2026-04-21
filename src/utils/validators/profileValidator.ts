import { z } from "zod";

export const createProfileSchema = z.object({
	name: z.string().min(1, "Name cannot be empty").max(100),
	image: z.url("Image must be a valid URL"),
	bio: z.string().max(500, "Bio cannot exceed 500 characters").optional(),
	languages: z.array(z.string().min(1)).max(20).optional(),
	hiddenIdentity: z.boolean().optional(),
});

export const updateProfileSchema = z.object({
	name: z.string().min(1, "Name cannot be empty").max(100).optional(),
	image: z.url("Image must be a valid URL").optional(),
	bio: z.string().max(500, "Bio cannot exceed 500 characters").optional(),
	languages: z.array(z.string().min(1)).max(20).optional(),
	hiddenIdentity: z.boolean().optional(),
});

export type CreateProfileType = z.infer<typeof createProfileSchema>;
export type UpdateProfileType = z.infer<typeof updateProfileSchema>;
