import type { Hono } from "hono";
import { injectable } from "..";
import { container } from "../container";
import { type Constructor, EContainerScope } from "../types";

type ControllerInstance = {
	controller?: Hono<any, any, any>;
};

type ControllerConstructor = Constructor<ControllerInstance> & {
	controller?: Hono<any, any, any>;
};

export function Controller(basePath: string) {
	return (target: ControllerConstructor) => {
		injectable(EContainerScope.Singleton)(target);
		const app = container.getConstant<Hono<any, any, any>>("app");
		const controller =
			container.get<ControllerInstance>(target).controller ?? target.controller;

		if (!controller) {
			throw new Error(
				`Missing controller property on ${target.name}. Add either an instance or static controller.`,
			);
		}

		app.route(basePath, controller);
	};
}
