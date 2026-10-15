import { readdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

export interface LoadedModule<T> {
  filePath: string;
  value: T;
}

const supportedExtensions = new Set([".ts", ".js", ".mjs"]);

export async function loadModules<T>(directory: string): Promise<LoadedModule<T>[]> {
  const files = await collectFiles(directory);
  const loaded: LoadedModule<T>[] = [];
  for (const filePath of files) {
    const module = await import(pathToFileURL(filePath).href);
    const value = (module.default ?? module.handler ?? module.event ?? module.command) as
      | T
      | undefined;
    if (value !== undefined) loaded.push({ filePath, value });
  }
  return loaded;
}

async function collectFiles(directory: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }

  const files: string[] = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
      continue;
    }
    const extension = entry.name.slice(entry.name.lastIndexOf("."));
    if (
      supportedExtensions.has(extension) &&
      !entry.name.endsWith(".d.ts") &&
      !entry.name.endsWith(".test.ts")
    ) {
      files.push(fullPath);
    }
  }
  return files;
}
