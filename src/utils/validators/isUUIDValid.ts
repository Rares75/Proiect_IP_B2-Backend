import * as z from "zod";

export const isUUIDValid = (uuid: string): boolean => {
	const uuidSchema = z.uuid();
	return uuidSchema.safeParse(uuid).success;
};
