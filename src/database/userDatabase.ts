import { LocalDatabase } from "./localDatabase";

export interface UserRecord<T extends Record<string, unknown> = Record<string, unknown>> {
	id: string;
	balance: number;
	data: T;
	createdAt: number;
	updatedAt: number;
}

type UserRow = {
	user_id: string;
	balance: number;
	data: string;
	created_at: number;
	updated_at: number;
};

export class UserDatabase {
	constructor(private readonly database: LocalDatabase) {}

	async getUser<T extends Record<string, unknown> = Record<string, unknown>>(
		userId: string,
	): Promise<UserRecord<T> | null> {
		const row = await this.database.get<UserRow>("users/getUser.sql", userId);
		return row ? this.mapRow<T>(row) : null;
	}

	async hasUser(userId: string): Promise<boolean> {
		const row = await this.database.get<{ present: number }>("users/hasUser.sql", userId);
		return Boolean(row);
	}

	async getBalance(userId: string): Promise<number> {
		const row = await this.database.get<{ balance: number }>("users/getBalance.sql", userId);
		return Number(row?.balance ?? 0);
	}

	async setUser<T extends Record<string, unknown>>(userId: string, data: T): Promise<UserRecord<T>> {
		const now = Date.now();
		await this.database.run("users/setUser.sql", userId, this.serializeData(data), now, now);
		const user = await this.getUser<T>(userId);
		if (!user) throw new Error(`Could not retrieve user "${userId}" after saving.`);
		return user;
	}

	async updateUser<T extends Record<string, unknown>>(
		userId: string,
		updater: (current: UserRecord<T>) => T | Promise<T>,
	): Promise<UserRecord<T>> {
		return this.database.transaction(async transaction => {
			const row = (await transaction.get(this.database.statement("users/getUser.sql"), userId)) as
				UserRow | undefined;
			const now = Date.now();
			const current = row
				? this.mapRow<T>(row)
				: { id: userId, balance: 0, data: {} as T, createdAt: now, updatedAt: now };
			const nextData = await updater(current);

			await transaction.run(
				this.database.statement("users/updateUser.sql"),
				userId,
				current.balance,
				this.serializeData(nextData),
				current.createdAt,
				now,
			);

			return {
				id: userId,
				balance: current.balance,
				data: nextData,
				createdAt: current.createdAt,
				updatedAt: now,
			};
		});
	}

	async addBalance(userId: string, amount: number): Promise<number> {
		this.assertFiniteAmount(amount);
		const now = Date.now();
		const row = await this.database.get<{ balance: number }>("users/addBalance.sql", userId, amount, now, now);
		if (!row) throw new Error(`Could not update balance for user "${userId}".`);
		return Number(row.balance);
	}

	async setBalance(userId: string, balance: number): Promise<number> {
		this.assertFiniteAmount(balance);
		const now = Date.now();
		await this.database.run("users/setBalance.sql", userId, balance, now, now);
		return balance;
	}

	async deleteUser(userId: string): Promise<boolean> {
		const result = await this.database.run("users/deleteUser.sql", userId);
		return result.changes > 0;
	}

	private mapRow<T extends Record<string, unknown>>(row: UserRow): UserRecord<T> {
		return {
			id: row.user_id,
			balance: Number(row.balance),
			data: JSON.parse(row.data) as T,
			createdAt: Number(row.created_at),
			updatedAt: Number(row.updated_at),
		};
	}

	private serializeData(data: Record<string, unknown>): string {
		const serialized = JSON.stringify(data);
		if (serialized === undefined) {
			throw new TypeError("User data must be JSON-serializable.");
		}
		return serialized;
	}

	private assertFiniteAmount(amount: number): void {
		if (!Number.isFinite(amount)) {
			throw new TypeError("Balance amounts must be finite numbers.");
		}
	}
}
