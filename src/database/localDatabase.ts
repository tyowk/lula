import { mkdir, readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { connect, type Database, type Transaction } from "@tursodatabase/database";
import { config } from "../config";

export interface QueryResult {
	changes: number;
	lastInsertRowid: number;
}

export class LocalDatabase {
	private connection?: Database;
	private statements = new Map<string, string>();

	async initialize(): Promise<void> {
		if (this.connection) return;
		await mkdir(dirname(config.database.file), { recursive: true });
		this.statements = await this.loadStatements(config.database.sqlDirectory);
		this.connection = await connect(config.database.file);
		await this.connection.exec(this.statement("schema.sql"));
	}

	statement(name: string): string {
		const statement = this.statements.get(name.replaceAll("\\", "/"));
		if (!statement) {
			throw new Error(`SQL statement "${name}" was not loaded.`);
		}
		return statement;
	}

	async get<T>(name: string, ...parameters: unknown[]): Promise<T | undefined> {
		return (await this.requireConnection().get(this.statement(name), ...parameters)) as T | undefined;
	}

	async run(name: string, ...parameters: unknown[]): Promise<QueryResult> {
		return (await this.requireConnection().run(this.statement(name), ...parameters)) as QueryResult;
	}

	async transaction<T>(action: (transaction: Transaction) => Promise<T>): Promise<T> {
		const execute = this.requireConnection().transactionAsync(action);
		return execute();
	}

	async close(): Promise<void> {
		if (!this.connection) return;
		await this.connection.close();
		this.connection = undefined;
	}

	private async loadStatements(directory: string): Promise<Map<string, string>> {
		const statements = new Map<string, string>();
		const files = await this.collectSqlFiles(directory);

		for (const filePath of files) {
			const key = relative(directory, filePath).split(sep).join("/");
			const sql = (await readFile(filePath, "utf8")).trim();
			if (!sql) throw new Error(`SQL file "${filePath}" is empty.`);
			statements.set(key, sql);
		}

		if (!statements.has("schema.sql")) {
			throw new Error(`Missing database schema: ${join(directory, "schema.sql")}`);
		}
		return statements;
	}

	private async collectSqlFiles(directory: string): Promise<string[]> {
		const entries = await readdir(directory, { withFileTypes: true });
		const files: string[] = [];

		for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
			const fullPath = join(directory, entry.name);
			if (entry.isDirectory()) {
				files.push(...(await this.collectSqlFiles(fullPath)));
			} else if (entry.isFile() && entry.name.endsWith(".sql")) {
				files.push(fullPath);
			}
		}

		return files;
	}

	private requireConnection(): Database {
		if (!this.connection) {
			throw new Error("Local database is not initialized.");
		}
		return this.connection;
	}
}
