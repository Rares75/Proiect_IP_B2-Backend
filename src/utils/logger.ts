/** biome-ignore-all lint/suspicious/noConsole: <logger utility> */

import { mainSymbols } from "figures";
import * as p from "picocolors";
import PrettyError from "pretty-error";

const pe = new PrettyError();

export type Logger = {
	error: (message: string) => void;
	success: (message: string) => void;
	exception: (error: unknown) => void;
	warn: (message: string) => void;
	info: (message: string) => void;
};

export const logger: Logger = {
	error: (message: string): void => {
		console.error(p.redBright(`${mainSymbols.cross} ${message}`));
	},
	success: (message: string): void => {
		console.log(p.green(`${mainSymbols.tick} ${message}`));
	},
	exception: (error: unknown): void => {
		if (error instanceof Error) {
			console.error(pe.render(error));
		} else {
			console.error(error);
		}
	},
	warn: (message: string): void => {
		console.warn(p.yellowBright(`${mainSymbols.warning} ${message}`));
	},
	info: (message: string): void => {
		console.log(p.blueBright(`${mainSymbols.info} ${message}`));
	},
};
