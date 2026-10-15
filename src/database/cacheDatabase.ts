import { config } from "../config";
import { LocalDatabase } from "./localDatabase";
import { Logger } from "../utils";

export class CacheDatabase {
	private readonly logger = new Logger();
	private cleanupTimer?: ReturnType<typeof setInterval>;

	constructor(private readonly database: LocalDatabase) {}

	async initialize(): Promise<void> {
		if (this.cleanupTimer) return;
		await this.sweepExpired();
		this.cleanupTimer = setInterval(() => {
			void this.sweepExpired().catch((error: unknown) => {
				this.logger.error("Cache cleanup failed.", error);
			});
		}, config.database.cacheCleanupIntervalMs);
		this.cleanupTimer.unref?.();
	}

	async get<T>(key: string): Promise<T | null> {
		const row = await this.database.get<{
			cache_value: string;
			expires_at: number | null;
		}>("cache/get.sql", key);

		if (!row) return null;
		if (row.expires_at !== null && row.expires_at <= Date.now()) {
			await this.delete(key);
			return null;
		}

		return JSON.parse(row.cache_value) as T;
	}

	async set<T>(key: string, value: T, ttlMs: number | null = config.database.defaultCacheTtlMs): Promise<void> {
		if (ttlMs !== null && (!Number.isFinite(ttlMs) || ttlMs < 0)) {
			throw new RangeError("Cache TTL must be a non-negative number or null.");
		}
		const serialized = JSON.stringify(value);
		if (serialized === undefined) {
			throw new TypeError("Cache values must be JSON-serializable.");
		}
		const now = Date.now();
		const expiresAt = ttlMs === null ? null : now + ttlMs;
		await this.database.run("cache/set.sql", key, serialized, expiresAt, now);
	}

	async has(key: string): Promise<boolean> {
		const row = await this.database.get<{ expires_at: number | null }>("cache/has.sql", key);
		if (!row) return false;
		if (row.expires_at !== null && row.expires_at <= Date.now()) {
			await this.delete(key);
			return false;
		}
		return true;
	}

	async delete(key: string): Promise<boolean> {
		const result = await this.database.run("cache/delete.sql", key);
		return result.changes > 0;
	}

	async clear(): Promise<void> {
		await this.database.run("cache/clear.sql");
	}

	async sweepExpired(): Promise<number> {
		const result = await this.database.run("cache/sweepExpired.sql", Date.now());
		return result.changes;
	}

	async close(): Promise<void> {
		if (this.cleanupTimer) clearInterval(this.cleanupTimer);
		this.cleanupTimer = undefined;
	}
}
