import { REST, Routes } from "discord.js";
import { config } from "./config";
import { DiscordClient } from "./handlers/discordClient";
import { Logger } from "./utils";

async function registerCommands(): Promise<void> {
  if (!config.discord.token || !config.discord.clientId) {
    throw new Error("DISCORD_TOKEN and DISCORD_CLIENT_ID are required to register commands.");
  }

  const client = new DiscordClient();
  await client.commandHandler.load();
  const commands = client.commandHandler.getSlashPayload();
  if (commands.length === 0) {
    throw new Error("No slash commands were found. Add command files with slash data before registering.");
  }
  const rest = new REST({ version: "10" }).setToken(config.discord.token);
  const route = config.discord.guildId
    ? Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId)
    : Routes.applicationCommands(config.discord.clientId);

  await rest.put(route, { body: commands });
  client.logger.success(
    `Registered ${commands.length} application command(s) ${config.discord.guildId ? `for guild ${config.discord.guildId}` : "globally"}.`,
  );
  client.destroy();
}

const logger = new Logger();

registerCommands().catch((error: unknown) => {
  logger.error("Slash command registration failed.", error);
  process.exitCode = 1;
});
