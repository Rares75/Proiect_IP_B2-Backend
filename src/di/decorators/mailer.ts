import { injectable } from "..";
import { type Constructor, EContainerScope } from "../types";

export const Mailer = () => {
	return (target: Constructor) => {
		injectable(EContainerScope.Singleton)(target);
	};
};
