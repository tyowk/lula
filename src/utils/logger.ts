import chalk from "chalk";
import { config } from "../config";

type LogLevel = "debug" | "info" | "success" | "warn" | "error" | "ready";

const priorities: Record<LogLevel, number> = {
	debug: 10,
	info: 20,
	success: 20,
	warn: 30,
	error: 40,
	ready: 20,
};

const styles: Record<LogLevel, (value: string) => string> = {
	debug: chalk.gray,
	info: chalk.cyan,
	success: chalk.green,
	warn: chalk.yellow,
	error: chalk.red,
	ready: chalk.greenBright.bold,
};

export class Logger {
	debug(message: string, ...details: unknown[]): void {
		this.write("debug", message, details);
	}

	info(message: string, ...details: unknown[]): void {
		this.write("info", message, details);
	}

	success(message: string, ...details: unknown[]): void {
		this.write("success", message, details);
	}

	warn(message: string, ...details: unknown[]): void {
		this.write("warn", message, details);
	}

	error(message: string, ...details: unknown[]): void {
		this.write("error", message, details);
	}

	ready(message: string, ...details: unknown[]): void {
		this.write("ready", message, details);
	}

	private write(level: LogLevel, message: string, details: unknown[]): void {
		const configuredLevel = (config.logging.level.toLowerCase() as LogLevel) || "debug";
		if (priorities[level] < (priorities[configuredLevel] ?? priorities.debug)) return;
		const timestamp = config.logging.timestamp ? chalk.gray(`[${new Date().toLocaleTimeString()}]`) : "";
		const label = styles[level](`[${level.toUpperCase()}]`);
		const output = [timestamp, label, message].filter(Boolean).join(" ");

		if (level === "error") {
			console.error(output, ...details);
			return;
		}
		if (level === "warn") {
			console.warn(output, ...details);
			return;
		}
		console.log(output, ...details);
	}
}
