import { injectable } from "..";
import { type Constructor, EContainerScope } from "../types";

export const repository = () => {
	return (target: Constructor) => {
		injectable(EContainerScope.Singleton)(target);
	};
};
