import { type Constructor, EContainerScope } from "./types";
import { container } from "./container";
import { inject as inversifyInject } from "inversify";
import { logger } from "../utils/logger";
export { inversifyInject as inject };
export { container };

export const injectable = (
	scope: EContainerScope = EContainerScope.Singleton,
) => {
	return (target: Constructor): void => {
		container.add(target, scope);
		logger.info(`${target.name}`);
	};
};
