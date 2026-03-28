import { Hono } from "hono";
import { Controller } from "../utils/Controller";
import { helpRequestService } from "../services/HelpRequestService";

@Controller("/tasks")
export class HelpRequestController {
  static controller = new Hono()
    .post("/", async (c) => {
      const body = await c.req.json();
      const result = await helpRequestService.createHelpRequest(body);
      return c.json(result, 201);
    });
}