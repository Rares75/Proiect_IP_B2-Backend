import { inject } from "../di";
import { UserAccessRepository } from "../db/repositories/userAccess.repository";
import { Service } from "../di/decorators/service";
import type { AccountStatusType } from "../types";

@Service()
export class UserAccessService {
	constructor(
		@inject(UserAccessRepository)
		private readonly userAccessRepo: UserAccessRepository,
	) {}

	async checkUserStatus(userId: string): Promise<AccountStatusType | null> {
		const userAccess = await this.userAccessRepo.findFirstBy({ userId });
		return userAccess?.status ?? "ACTIVE";
	}
}
