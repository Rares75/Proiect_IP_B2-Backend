import { randomUUID } from "node:crypto";

import { Service } from "../di/decorators/service";

@Service()
export class GuestSessionService {
	createSessionId(): string {
		return randomUUID();
	}
}
