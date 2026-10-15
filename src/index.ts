import { DiscordClient } from "./handlers/discordClient";
import { Logger } from "./utils/logger";

const logger = new Logger();
const client = new DiscordClient();

process.once("SIGINT", () => {
	void client.shutdown().finally(() => process.exit(0));
});

process.once("SIGTERM", () => {
	void client.shutdown().finally(() => process.exit(0));
});

client.start().catch(async (error: unknown) => {
	logger.error("Bot startup failed.", error);
	await client.shutdown().catch(() => undefined);
	process.exitCode = 1;
});
