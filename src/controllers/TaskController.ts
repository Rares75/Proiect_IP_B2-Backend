import { Hono } from "hono";
import { Controller } from "../utils/Controller";
import { taskService } from "@server/services/TaskService";
import {TaskStatusEnum} from "@server/db/schema";

const VALID_STATUSES = TaskStatusEnum.enumValues; // ["OPEN", "CLAIMED", "DONE"]

@Controller("/tasks")
export class TaskController {

}