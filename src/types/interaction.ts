import type { AnySelectMenuInteraction, ButtonInteraction, ModalSubmitInteraction } from "discord.js";
import type { DiscordClient } from "../handlers/discordClient";

export type ComponentInteraction = ButtonInteraction | AnySelectMenuInteraction | ModalSubmitInteraction;

export type InteractionKind =
	"button" | "stringSelect" | "userSelect" | "roleSelect" | "channelSelect" | "mentionableSelect" | "modal";

export interface BotInteractionHandler {
	type: InteractionKind | "selectMenu";
	customId: string | RegExp;
	execute: (interaction: ComponentInteraction, client: DiscordClient) => unknown | Promise<unknown>;
}
