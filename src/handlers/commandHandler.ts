import { Collection, type ChatInputCommandInteraction, type Message, type PermissionResolvable } from "discord.js";
import { config } from "../config";
import type { BotCommand } from "../types/command";
import type { DiscordClient } from "./discordClient";
import { loadModules } from "../utils";

export class CommandHandler {
	readonly commands = new Collection<string, BotCommand>();
	private readonly aliases = new Map<string, string>();
	private readonly cooldowns = new Map<string, number>();

	constructor(private readonly client: DiscordClient) {}

	get size(): number {
		return this.commands.size;
	}

	async load(): Promise<void> {
		const modules = await loadModules<BotCommand>(config.paths.commands);
		for (const { value: command, filePath } of modules) {
			if (
				!command.name ||
				(!command.execute && !command.executeSlash) ||
				(command.data && !command.executeSlash) ||
				(command.executeSlash && !command.data)
			) {
				throw new Error(`Invalid command module: ${filePath}`);
			}
			const name = this.normalize(command.name);
			if (this.commands.has(name) || this.aliases.has(name)) {
				throw new Error(`Duplicate command name "${command.name}" in ${filePath}`);
			}
			this.commands.set(name, command);
			for (const alias of command.aliases ?? []) {
				const normalizedAlias = this.normalize(alias);
				if (this.commands.has(normalizedAlias) || this.aliases.has(normalizedAlias)) {
					throw new Error(`Duplicate command alias "${alias}" in ${filePath}`);
				}
				this.aliases.set(normalizedAlias, name);
			}
		}
		this.client.logger.info(`Loaded ${this.commands.size} command(s).`);
	}

	async handleMessage(message: Message): Promise<void> {
		if (message.author.bot || message.webhookId || !message.content) return;
		const prefix = await this.resolvePrefix(message);
		if (!prefix || !message.content.startsWith(prefix)) return;

		const input = message.content.slice(prefix.length).trim();
		if (!input) return;
		const [rawName, ...args] = input.split(/\s+/);
		const command = this.get(rawName);
		const language = this.client.i18n.resolveLanguage(message.guild?.preferredLocale);

		if (!command) {
			if (config.commands.unknownCommandResponse) {
				await message.reply(this.client.i18n.t(language, "errors.unknownCommand", { command: rawName }));
			}
			return;
		}
		if (!command.execute) return;

		const rejection = await this.checkCommand(
			command,
			message.author.id,
			message.guildId,
			message.member?.permissions,
			language,
		);
		if (rejection) {
			await message.reply(rejection);
			return;
		}

		this.setCooldown(command, message.author.id);
		try {
			await command.execute(message, args, this.client);
		} catch (error) {
			this.client.logger.error(`Prefix command "${command.name}" failed.`, error);
			await message.reply(this.client.i18n.t(language, "errors.commandFailed")).catch(() => undefined);
		}
	}

	async handleSlash(interaction: ChatInputCommandInteraction): Promise<void> {
		const command = this.get(interaction.commandName);
		const language = this.client.i18n.resolveLanguage(interaction.locale);
		if (!command?.executeSlash) {
			await interaction.reply({
				content: this.client.i18n.t(language, "commands.slashUnavailable"),
				ephemeral: true,
			});
			return;
		}

		const rejection = await this.checkCommand(
			command,
			interaction.user.id,
			interaction.guildId,
			interaction.memberPermissions ?? undefined,
			language,
		);
		if (rejection) {
			await interaction.reply({ content: rejection, ephemeral: true });
			return;
		}

		this.setCooldown(command, interaction.user.id);
		try {
			await command.executeSlash(interaction, this.client);
		} catch (error) {
			this.client.logger.error(`Slash command "${command.name}" failed.`, error);
			const content = this.client.i18n.t(language, "errors.commandFailed");
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({ content, ephemeral: true }).catch(() => undefined);
			} else {
				await interaction.reply({ content, ephemeral: true }).catch(() => undefined);
			}
		}
	}

	async setGuildPrefix(guildId: string, prefix: string): Promise<void> {
		if (!prefix.trim()) throw new TypeError("A server prefix cannot be empty.");
		await this.client.cacheDb.set(`guild-prefix:${guildId}`, prefix.trim(), null);
	}

	getSlashPayload(): unknown[] {
		return [...this.commands.values()].filter(command => command.data).map(command => command.data!.toJSON());
	}

	private async resolvePrefix(message: Message): Promise<string | null> {
		if (this.client.user && config.discord.mentionPrefix) {
			const mentionPrefixes = [`<@${this.client.user.id}>`, `<@!${this.client.user.id}>`];
			const mention = mentionPrefixes.find(candidate => message.content.startsWith(candidate));
			if (mention) return mention;
		}
		if (message.guildId) {
			const serverPrefix = await this.client.cacheDb.get<string>(`guild-prefix:${message.guildId}`);
			if (serverPrefix && message.content.startsWith(serverPrefix)) return serverPrefix;
		}
		return message.content.startsWith(config.discord.prefix) ? config.discord.prefix : null;
	}

	private async checkCommand(
		command: BotCommand,
		userId: string,
		guildId: string | null,
		permissions: Readonly<import("discord.js").PermissionsBitField> | null | undefined,
		language: string,
	): Promise<string | null> {
		if (command.guildOnly && !guildId) {
			return this.client.i18n.t(language, "commands.guildOnly");
		}
		if (command.ownerOnly && !config.discord.owners.includes(userId)) {
			return this.client.i18n.t(language, "commands.ownerOnly");
		}

		if (command.permissions?.length) {
			if (!permissions || !this.hasPermissions(permissions, command.permissions)) {
				return this.client.i18n.t(language, "commands.missingPermissions");
			}
		}

		const cooldownMs = command.cooldownMs ?? config.commands.defaultCooldownMs;
		if (cooldownMs > 0) {
			const key = `${userId}:${this.normalize(command.name)}`;
			const expiresAt = this.cooldowns.get(key) ?? 0;
			if (expiresAt > Date.now()) {
				return this.client.i18n.t(language, "commands.cooldown", {
					seconds: ((expiresAt - Date.now()) / 1000).toFixed(1),
				});
			}
		}
		return null;
	}

	private hasPermissions(
		current: Readonly<import("discord.js").PermissionsBitField>,
		required: PermissionResolvable[],
	): boolean {
		return current.has(required);
	}

	private setCooldown(command: BotCommand, userId: string): void {
		const cooldownMs = command.cooldownMs ?? config.commands.defaultCooldownMs;
		if (cooldownMs <= 0) return;
		const key = `${userId}:${this.normalize(command.name)}`;
		const expiresAt = Date.now() + cooldownMs;
		this.cooldowns.set(key, expiresAt);
		setTimeout(() => {
			if (this.cooldowns.get(key) === expiresAt) this.cooldowns.delete(key);
		}, cooldownMs).unref?.();
	}

	private get(name: string): BotCommand | undefined {
		const normalized = this.normalize(name);
		return this.commands.get(normalized) ?? this.commands.get(this.aliases.get(normalized) ?? "");
	}

	private normalize(name: string): string {
		return config.commands.caseInsensitive ? name.toLowerCase() : name;
	}
}
