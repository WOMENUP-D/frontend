/**
 * Every language of the dictionary, for server code and unit tests (QA H-02).
 *
 * Imported for its effect by `server.ts`: the root layout, `generateMetadata`,
 * the sitemap and the error pages translate on the server and may need any
 * language at once. Never import this from a client component — it carries
 * all three languages; the browser gets them one at a time from
 * `dictionary.ts`.
 */
import { messages } from "./messages";
import { registerTable } from "./core";
import type { WrittenLocale } from "./locales";

export function registerAllTables(): void {
  for (const language of ["uz", "ru", "en"] as WrittenLocale[]) {
    const table: Record<string, string> = {};
    for (const [key, entry] of Object.entries(messages)) {
      const text = (entry as Record<string, string>)[language];
      if (typeof text === "string") table[key] = text;
    }
    registerTable(language, table);
  }
}

registerAllTables();
