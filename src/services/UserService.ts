import { inject } from "inversify";
import {
	type CreateUserDTO,
	type UpdateUserDTO,
	type User,
	UserRepository,
} from "../db/repositories/user.repository";
import { Service } from "../di/decorators/service";

@Service()
export class UserService {
	constructor(
		@inject(UserRepository) private readonly userRepository: UserRepository,
	) {}
	/**
	 * Creates a new user after checking for duplicate email.
	 */
	async createUser(data: CreateUserDTO): Promise<User> {
		const existing = await this.userRepository.findFirstBy({
			email: data.email,
		});
		if (existing) {
			throw new Error(`User with email '${data.email}' already exists.`);
		}

		return await this.userRepository.create({
			...data,
			email: data.email.trim().toLowerCase(),
			name: data.name.trim(),
		});
	}

	/**
	 * Returns a user by id, throws if not found.
	 */
	async getUserById(id: string): Promise<User> {
		const user = await this.userRepository.findById(id);
		if (!user) {
			throw new Error(`User with id '${id}' not found.`);
		}
		return user;
	}

	/**
	 * Returns a user by email, throws if not found.
	 */
	async getUserByEmail(email: string): Promise<User> {
		const user = await this.userRepository.findFirstBy({
			email: email.trim().toLowerCase(),
		});
		if (!user) {
			throw new Error(`User with email '${email}' not found.`);
		}
		return user;
	}

	/**
	 * Returns paginated list of users.
	 */
	async getUsers(limit = 50, offset = 0): Promise<User[]> {
		return await this.userRepository.findMany(limit, offset);
	}

	/**
	 * Updates a user after checking existence.
	 */
	async updateUser(id: string, data: UpdateUserDTO): Promise<User | null> {
		const exists = await this.userRepository.exists(id);
		if (!exists) {
			throw new Error(`User with id '${id}' not found.`);
		}

		const sanitized: UpdateUserDTO = {
			...data,
			...(data.email && { email: data.email.trim().toLowerCase() }),
			...(data.name && { name: data.name.trim() }),
		};

		const updated = await this.userRepository.update(id, sanitized);
		return updated ?? null;
	}

	/**
	 * Deletes a user after checking existence.
	 */
	async deleteUser(id: string): Promise<boolean> {
		const exists = await this.userRepository.exists(id);
		if (!exists) {
			throw new Error(`User with id '${id}' not found.`);
		}
		return await this.userRepository.delete(id);
	}

	/**
	 * Returns total count of users.
	 */
	async countUsers(): Promise<number> {
		return await this.userRepository.count();
	}
}
