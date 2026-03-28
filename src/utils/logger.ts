import { Chalk } from "chalk";
import figures from "figures";
import pe from "./pretty-error";
const chalk = new Chalk();

export const logger = {
	info: (message: string) => {
		console.log(chalk.blue(`${figures.info} ${message}`));
	},
	success: (message: string) => {
		console.log(chalk.magentaBright(`${figures.tick} ${message}`));
	},
	error: (message: string) => {
		console.error(chalk.redBright(`${figures.cross} ${message}`));
	},
	exception: (error: Error) => {
		console.error(pe.render(error));
	},
};
//logger to use in the whole application, with different levels of logging and pretty error rendering
