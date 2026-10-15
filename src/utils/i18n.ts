import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { config, type SupportedLanguage } from "../config";

type CatalogValue = string | { [key: string]: CatalogValue };
type Catalog = Record<string, CatalogValue>;

export class I18n {
  private catalogs = new Map<string, Catalog>();

  async initialize(): Promise<void> {
    if (
      !config.i18n.supportedLanguages.includes(
        config.i18n.defaultLanguage as SupportedLanguage,
      )
    ) {
      throw new Error(
        `DEFAULT_LANGUAGE "${config.i18n.defaultLanguage}" is not listed in supportedLanguages.`,
      );
    }
    for (const language of config.i18n.supportedLanguages) {
      const filePath = join(config.paths.locales, `${language}.json`);
      const contents = await readFile(filePath, "utf8");
      this.catalogs.set(language, JSON.parse(contents) as Catalog);
    }
  }

  resolveLanguage(locale?: string | null): SupportedLanguage {
    if (!locale) return config.i18n.defaultLanguage as SupportedLanguage;
    const normalized = locale.toLowerCase().replace("_", "-");
    const exact = config.i18n.supportedLanguages.find(
      (language) => language.toLowerCase() === normalized,
    );
    const base = normalized.split("-")[0];
    const short = config.i18n.supportedLanguages.find(
      (language) => language.toLowerCase() === base,
    );
    return (exact ?? short ?? config.i18n.defaultLanguage) as SupportedLanguage;
  }

  t(
    language: string | null | undefined,
    key: string,
    replacements: Record<string, string | number> = {},
  ): string {
    const selected = this.resolveLanguage(language);
    const fallback = config.i18n.defaultLanguage as SupportedLanguage;
    let message =
      this.findMessage(this.catalogs.get(selected), key) ??
      this.findMessage(this.catalogs.get(fallback), key) ??
      key;
    for (const [name, value] of Object.entries(replacements)) {
      message = message.replaceAll(`{${name}}`, String(value));
    }
    return message;
  }

  private findMessage(catalog: Catalog | undefined, key: string): string | undefined {
    let value: CatalogValue | undefined = catalog;
    for (const part of key.split(".")) {
      if (typeof value !== "object" || value === null) return undefined;
      value = value[part];
    }
    return typeof value === "string" ? value : undefined;
  }
}
