import { eq } from "drizzle-orm";
import { requestStatusEnum } from "../db/enums";
import { helpRequests } from "../db/requests";
import type { TaskFilterParams } from "./types";

const VALID_STATUSES = new Set(requestStatusEnum.enumValues);

export const parseStatusFilter = (status?: string) => {
	if (status === undefined) {
		return { validData: {} satisfies TaskFilterParams };
	}

	if (
		VALID_STATUSES.has(status as (typeof requestStatusEnum.enumValues)[number])
	) {
		return {
			validData: {
				status: status as (typeof requestStatusEnum.enumValues)[number],
			} satisfies TaskFilterParams,
		};
	}

	return {
		error: `Eroare: 'status' accepta doar: ${requestStatusEnum.enumValues.join(", ")}.`,
	};
};

export const buildStatusFilter = ({ status }: TaskFilterParams) => {
	if (!status) {
		return undefined;
	}

	return eq(helpRequests.status, status);
};
