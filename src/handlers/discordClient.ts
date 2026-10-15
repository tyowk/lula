import { Client, type ClientOptions } from "discord.js";
import { config } from "../config";
import { LocalDatabase } from "../database/localDatabase";
import { CacheDatabase } from "../database/cacheDatabase";
import { UserDatabase } from "../database/userDatabase";
import { CommandHandler } from "./commandHandler";
import { EventHandler } from "./eventHandler";
import { InteractionHandler } from "./interactionHandler";
import { I18n, Logger } from "../utils";

export class DiscordClient extends Client {
	readonly logger = new Logger();
	readonly i18n = new I18n();
	readonly database = new LocalDatabase();
	readonly cacheDb = new CacheDatabase(this.database);
	readonly userDb = new UserDatabase(this.database);
	readonly commandHandler = new CommandHandler(this);
	readonly eventHandler = new EventHandler(this);
	readonly interactionHandler = new InteractionHandler(this);
	private started = false;

	constructor(options: Partial<ClientOptions> = {}) {
		super({
			...options,
			intents: options.intents ?? config.discord.intents,
			partials: options.partials ?? config.discord.partials,
			allowedMentions: options.allowedMentions ?? config.discord.allowedMentions,
		});
	}

	async start(): Promise<void> {
		if (this.started) {
			throw new Error("The Discord client has already been started.");
		}
		if (!config.discord.token) {
			throw new Error("DISCORD_TOKEN is required. Add it to your environment or .env file.");
		}

		this.started = true;
		await this.database.initialize();
		await this.cacheDb.initialize();
		await this.i18n.initialize();
		await this.commandHandler.load();
		await this.interactionHandler.load();
		await this.eventHandler.load();

		this.on("messageCreate", message => {
			void this.commandHandler
				.handleMessage(message)
				.catch((error: unknown) => this.logger.error("Message handler failed.", error));
		});
		this.on("interactionCreate", interaction => {
			void this.interactionHandler
				.handle(interaction)
				.catch((error: unknown) => this.logger.error("Interaction dispatcher failed.", error));
		});
		this.once("clientReady", client => {
			this.logger.ready(`Connected as ${client.user.tag}`);
			this.logger.info(
				`${this.commandHandler.size} command(s), ${this.interactionHandler.size} interaction handler(s), ${this.eventHandler.size} event(s) loaded`,
			);
		});

		await this.login(config.discord.token);
	}

	async shutdown(): Promise<void> {
		this.destroy();
		await this.cacheDb.close();
		await this.database.close();
		this.logger.info("Database connections closed.");
	}
}
