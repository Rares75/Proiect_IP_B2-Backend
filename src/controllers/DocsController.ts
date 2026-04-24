import { Scalar } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { openAPIRouteHandler } from "hono-openapi";
import app from "../app";
import { Controller } from "../utils/controller";

@Controller("/docs")
export class DocsController {
	static controller = new Hono()
		.get(
			"/",
			Scalar({
				url: "/api/docs/openapi.json",
				theme: "kepler",
				layout: "modern",
				defaultHttpClient: {
					targetKey: "js",
					clientKey: "fetch",
				},
			}),
		)
		.get(
			"/openapi.json",
			openAPIRouteHandler(app, {
				documentation: {
					openapi: "3.1.0",
					info: {
						title: "Proiect IP Backend API",
						version: "1.0.0",
					},
					servers: [
						{
							url: "http://localhost:3000",
							description: "Local development server",
						},
					],
				},
				includeEmptyPaths: true,
				exclude: /^\/api\/docs/,
			}),
		);
}
