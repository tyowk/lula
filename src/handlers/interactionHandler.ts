import type { Interaction } from "discord.js";
import { config } from "../config";
import type { BotInteractionHandler, InteractionKind } from "../types/interaction";
import type { DiscordClient } from "./discordClient";
import { loadModules } from "../utils";

export class InteractionHandler {
  private handlers: BotInteractionHandler[] = [];

  constructor(private readonly client: DiscordClient) {}

  get size(): number {
    return this.handlers.length;
  }

  async load(): Promise<void> {
    const modules = await loadModules<BotInteractionHandler>(config.paths.interactions);
    for (const { value: handler, filePath } of modules) {
      if (
        !handler.customId ||
        !handler.type ||
        typeof handler.execute !== "function"
      ) {
        throw new Error(`Invalid interaction module: ${filePath}`);
      }
      this.handlers.push(handler);
    }
    this.client.logger.info(`Loaded ${this.handlers.length} interaction handler(s).`);
  }

  async handle(interaction: Interaction): Promise<void> {
    if (interaction.isChatInputCommand()) {
      await this.client.commandHandler.handleSlash(interaction);
      return;
    }

    const kind = this.getKind(interaction);
    if (!kind || !("customId" in interaction)) return;
    const handler = this.handlers.find(
      (candidate) =>
        (candidate.type === kind ||
          (candidate.type === "selectMenu" && kind !== "button" && kind !== "modal")) &&
        this.matches(candidate.customId, interaction.customId),
    );
    if (!handler) return;

    try {
      await handler.execute(interaction, this.client);
    } catch (error) {
      this.client.logger.error(
        `${kind} handler "${String(handler.customId)}" failed.`,
        error,
      );
      const content = this.client.i18n.t(
        this.client.i18n.resolveLanguage(
          "locale" in interaction ? String(interaction.locale) : undefined,
        ),
        "interactions.failed",
      );
      if (interaction.isRepliable()) {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content, ephemeral: true }).catch(() => undefined);
        } else {
          await interaction.reply({ content, ephemeral: true }).catch(() => undefined);
        }
      }
    }
  }

  private getKind(interaction: Interaction): InteractionKind | null {
    if (interaction.isButton()) return "button";
    if (interaction.isStringSelectMenu()) return "stringSelect";
    if (interaction.isUserSelectMenu()) return "userSelect";
    if (interaction.isRoleSelectMenu()) return "roleSelect";
    if (interaction.isChannelSelectMenu()) return "channelSelect";
    if (interaction.isMentionableSelectMenu()) return "mentionableSelect";
    if (interaction.isModalSubmit()) return "modal";
    return null;
  }

  private matches(pattern: string | RegExp, customId: string): boolean {
    if (typeof pattern === "string") return pattern === customId;
    pattern.lastIndex = 0;
    return pattern.test(customId);
  }
}
