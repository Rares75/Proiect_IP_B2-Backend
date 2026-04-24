import { injectable } from "..";
import { EContainerScope, type Constructor } from "../types";

export const Service = () => {
	return (target: Constructor) => {
		injectable(EContainerScope.Singleton)(target);
	};
};
