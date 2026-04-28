// 404 resursa cu id-ul dat nu exista  in db
export class NotFoundError extends Error {
	constructor(resource: string, id: string) {
		super(`${resource} with id ${id} not found`);
		this.name = "NotFoundError";
	}
}

// 400 tranzitia de status ceruta nu este permisa
export class InvalidStatusTransitionError extends Error {
	constructor(from: string, to: string) {
		super(`Invalid transition from ${from} to ${to}`);
		this.name = "InvalidStatusTransitionError";
	}
}

export class ConflictError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ConflictError";
	}
}

//400 date de intrare invalide sau lipsa
export class ValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ValidationError";
	}
}

//nu are permisiunea de a vizualiza
export class ForbiddenError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ForbidenError";
	}
}
