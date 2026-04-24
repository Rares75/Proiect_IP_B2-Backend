import { Hono } from "hono";
import { Controller } from "../utils/controller";

@Controller('/test')
export class TestController {
  static controller = new Hono().get('/1', (c) => {
    return c.text('test');
  }).get('/some', (c) => {
    return c.json('some' , 200);
  })
}
