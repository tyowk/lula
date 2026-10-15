import type {
  ChatInputCommandInteraction,
  Message,
  PermissionResolvable,
  SlashCommandBuilder,
} from "discord.js";
import type { DiscordClient } from "../handlers/discordClient";

export interface BotCommand {
  name: string;
  description?: string;
  aliases?: string[];
  usage?: string;
  cooldownMs?: number;
  guildOnly?: boolean;
  ownerOnly?: boolean;
  permissions?: PermissionResolvable[];
  data?: SlashCommandBuilder;
  execute?: (message: Message, args: string[], client: DiscordClient) => unknown | Promise<unknown>;
  executeSlash?: (
    interaction: ChatInputCommandInteraction,
    client: DiscordClient,
  ) => unknown | Promise<unknown>;
}
