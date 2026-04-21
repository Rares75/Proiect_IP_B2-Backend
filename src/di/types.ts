/** biome-ignore-all lint/suspicious/noExplicitAny: trust me */

export enum EContainerScope {
	Singleton = "singleton",
	Transient = "transient",
	Request = "request",
}

export type Constructor<T = unknown> = new (...args: any[]) => T;

export interface IContainer {
	add: (target: Constructor, scope?: EContainerScope) => void;
	get: <T>(target: Constructor<T>) => T;
	has: (target: Constructor) => boolean;
	remove: (target: Constructor) => void;
	addConstant: <T>(identifier: string | symbol, value: T) => void;
	getConstant: <T>(identifier: string | symbol) => T;
	hasConstant: (identifier: string | symbol) => boolean;
	removeConstant(identifier: string | symbol): void;
}
