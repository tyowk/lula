import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { config } from "../config";
import type { DiscordClient } from "../handlers/discordClient";
import type { BotCommand } from "../types/command";
import { formatBytes, formatDuration, formatUptime } from "../utils/formatters";

type PingMetrics = {
	responseMs: number;
	databaseMs: number;
};

async function measureDatabase(client: DiscordClient): Promise<number> {
	const startedAt = performance.now();
	const result = await client.database.get<{ healthy: number }>("healthCheck.sql");
	if (result?.healthy !== 1) {
		throw new Error("Database health check returned an unexpected result.");
	}
	return performance.now() - startedAt;
}

function createPingEmbed(client: DiscordClient, metrics: PingMetrics): EmbedBuilder {
	const memory = process.memoryUsage();
	return new EmbedBuilder()
		.setColor(config.appearance.embedColor)
		.setTitle("Pong!")
		.setDescription("Live bot health and latency metrics")
		.addFields(
			{
				name: "Response",
				value: formatDuration(metrics.responseMs),
				inline: true,
			},
			{
				name: "Gateway",
				value: formatDuration(client.ws.ping),
				inline: true,
			},
			{
				name: "Database",
				value: formatDuration(metrics.databaseMs),
				inline: true,
			},
			{
				name: "Uptime",
				value: formatUptime(client.uptime),
				inline: true,
			},
			{
				name: "Memory",
				value: `RSS: ${formatBytes(memory.rss)}\nHeap: ${formatBytes(memory.heapUsed)}`,
				inline: true,
			},
			{
				name: "Servers",
				value: String(client.guilds.cache.size),
				inline: true,
			},
		)
		.setTimestamp();
}

const command: BotCommand = {
	name: "ping",
	description: "Check response, gateway, database, uptime, and memory health",
	cooldownMs: 3000,
	data: new SlashCommandBuilder()
		.setName("ping")
		.setDescription("Check response, gateway, database, uptime, and memory health"),
	async execute(message, _args, client) {
		const startedAt = performance.now();
		const response = await message.reply("Checking bot health...");
		const responseMs = performance.now() - startedAt;
		const databaseMs = await measureDatabase(client);
		const embed = createPingEmbed(client, { responseMs, databaseMs });
		await response.edit({ content: "", embeds: [embed] });
	},
	async executeSlash(interaction, client) {
		const startedAt = performance.now();
		await interaction.deferReply();
		const responseMs = performance.now() - startedAt;
		const databaseMs = await measureDatabase(client);
		const embed = createPingEmbed(client, { responseMs, databaseMs });
		await interaction.editReply({ embeds: [embed] });
	},
};

export default command;
