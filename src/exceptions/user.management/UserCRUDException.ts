type CRUDMethod = "create" | "read" | "update" | "delete";

export class UserCRUDException extends Error {
	constructor(message: string, method: CRUDMethod) {
		super(`${method.charAt(0).toUpperCase() + method.slice(1)}: ${message}`);
		this.name = "UserCRUDException";
	}
}
