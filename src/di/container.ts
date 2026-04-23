/** biome-ignore-all lint/suspicious/noExplicitAny: trust me */

import { Container as InversifyContainer, injectable } from "inversify";
import { type Constructor, EContainerScope } from "./types";
import { ContainerException } from "./ContainerException";

const di = new InversifyContainer();

export class Container {
	public add(
		target: Constructor,
		scope: EContainerScope = EContainerScope.Singleton,
	): void {
		try {
			di.unbind(target);
		} catch {}

		try {
			injectable()(target);
		} catch {}

		const binding = di.bind(target).toSelf();

		switch (scope) {
			case EContainerScope.Request:
				binding.inRequestScope();
				break;
			case EContainerScope.Transient:
				binding.inTransientScope();
				break;
			default:
				binding.inSingletonScope();
		}
	}

	public get<T>(target: Constructor<T>): T {
		try {
			return di.get<T>(target);
		} catch (error) {
			throw new ContainerException(
				`Failed to resolve dependency for ${target.name}.`,
				error instanceof Error ? error : undefined,
			);
		}
	}

	public removeConstant(identifier: string | symbol): void {
		if (di.isBound(identifier)) {
			di.unbind(identifier);
		}
	}
	public has(target: Constructor): boolean {
		return di.isBound(target);
	}
	public getConstant<T>(identifier: string | symbol): T {
		try {
			return di.get<T>(identifier);
		} catch (error) {
			throw new ContainerException(
				`Failed to resolve constant for identifier ${String(identifier)}.`,
				error instanceof Error ? error : undefined,
			);
		}
	}

	public addConstant<T>(identifier: string | symbol, value: T): void {
		try {
			di.unbind(identifier);
		} catch {}

		di.bind<T>(identifier).toConstantValue(value);
	}
	public hasConstant(identifier: string | symbol): boolean {
		return di.isBound(identifier);
	}

	public remove(target: Constructor): void {
		if (di.isBound(target)) {
			di.unbind(target);
		}
	}
}

export const container: Container = new Container();
