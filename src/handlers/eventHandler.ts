import type { ClientEvents } from "discord.js";
import { config } from "../config";
import type { BotEvent } from "../types/event";
import type { DiscordClient } from "./discordClient";
import { loadModules } from "../utils";

export class EventHandler {
  private loaded = 0;

  constructor(private readonly client: DiscordClient) {}

  get size(): number {
    return this.loaded;
  }

  async load(): Promise<void> {
    const modules = await loadModules<BotEvent>(config.paths.events);
    for (const { value: event, filePath } of modules) {
      if (!event.name || typeof event.execute !== "function") {
        throw new Error(`Invalid event module: ${filePath}`);
      }

      const listener = (...args: unknown[]) => {
        Promise.resolve(event.execute(...args, this.client)).catch((error: unknown) => {
          this.client.logger.error(`Event "${event.name}" failed.`, error);
        });
      };

      if (event.once) {
        this.client.once(event.name as keyof ClientEvents, listener as never);
      } else {
        this.client.on(event.name as keyof ClientEvents, listener as never);
      }
      this.loaded += 1;
    }
    this.client.logger.info(`Loaded ${this.loaded} event(s).`);
  }
}
