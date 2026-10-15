import "dotenv/config";
import { resolve } from "node:path";
import { GatewayIntentBits, Partials } from "discord.js";

const projectRoot = process.cwd();
const listFromEnv = (value: string | undefined): string[] =>
	value
		?.split(",")
		.map(item => item.trim())
		.filter(Boolean) ?? [];

export const config = {
	discord: {
		token: process.env.DISCORD_TOKEN ?? "",
		clientId: process.env.DISCORD_CLIENT_ID ?? "",
		guildId: process.env.DISCORD_GUILD_ID ?? "",
		prefix: process.env.BOT_PREFIX ?? "!",
		mentionPrefix: true,
		owners: listFromEnv(process.env.BOT_OWNER_IDS),
		intents: [
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.DirectMessages,
			GatewayIntentBits.MessageContent,
		],
		partials: [Partials.Channel, Partials.Message],
		allowedMentions: {
			parse: [] as ("users" | "roles" | "everyone")[],
			repliedUser: false,
		},
	},
	paths: {
		commands: resolve(projectRoot, "src/commands"),
		events: resolve(projectRoot, "src/events"),
		interactions: resolve(projectRoot, "src/interactions"),
		locales: resolve(projectRoot, "src/locales"),
	},
	database: {
		file: resolve(projectRoot, process.env.DATABASE_FILE ?? "data/bot.db"),
		sqlDirectory: resolve(projectRoot, "src/database/sql"),
		defaultCacheTtlMs: 5 * 60 * 1000,
		cacheCleanupIntervalMs: 60 * 1000,
	},
	commands: {
		defaultCooldownMs: 2500,
		unknownCommandResponse: true,
		caseInsensitive: true,
	},
	i18n: {
		defaultLanguage: process.env.DEFAULT_LANGUAGE ?? "en",
		supportedLanguages: ["en", "id"],
	},
	logging: {
		level: process.env.LOG_LEVEL ?? "debug",
		timestamp: true,
	},
	appearance: {
		embedColor: 0x2f2f2f,
	},
} as const;

export type SupportedLanguage = (typeof config.i18n.supportedLanguages)[number];
