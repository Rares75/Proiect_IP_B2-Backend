import type {requestStatusEnum} from "../db/enums";

export type RequestStatus = (typeof requestStatusEnum.enumValues)[number];

export type TaskFilterParams = {
    status?: RequestStatus;
    language?: string;
    skills?: string[];
};
