import type { Guild } from "discord.js";
import type { BotEvent } from "../types/event";
import type { DiscordClient } from "../handlers/discordClient";

const event: BotEvent = {
	name: "guildCreate",
	async execute(guild: Guild, client: DiscordClient) {
		client.logger.info(`Joined server ${guild.name} (${guild.id}).`);
	},
};

export default event;
