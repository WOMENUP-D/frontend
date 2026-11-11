/**
 * The UI dictionary, one language at a time (QA H-02).
 *
 * `messages.ts` keeps all three languages side by side and stays the only
 * place strings are written. The build cuts it per language (see
 * scripts/i18n-locale-loader.cjs): Uzbek, the default, is part of the bundle;
 * Russian and English are separate chunks fetched the first time they are
 * needed and cached for the life of the page. `t()` reads the current
 * language's table and falls back to Uzbek, exactly as before.
 */
import uz from "./messages?locale=uz";

export type Written = "uz" | "ru" | "en";
export type Table = Record<string, string>;

const tables: Partial<Record<Written, Table>> = { uz };
const pending: Partial<Record<Written, Promise<Table>>> = {};

function fetchTable(language: Exclude<Written, "uz">): Promise<{ default: Table }> {
  return language === "ru" ? import("./messages?locale=ru") : import("./messages?locale=en");
}

/** The table if it is already here — synchronously, so a switch to a language
 *  already loaded never waits. */
export function tableNow(language: Written): Table | undefined {
  return tables[language];
}

/** The table, loading it once. The same promise is returned every time, so it
 *  can be handed to React's `use()`. */
export function loadTable(language: Written): Promise<Table> {
  const ready = tables[language];
  if (ready) return Promise.resolve(ready);
  if (language === "uz") return Promise.resolve(uz);
  pending[language] ??= fetchTable(language)
    .then((module) => (tables[language] = module.default))
    .catch((error) => {
      delete pending[language];
      throw error;
    });
  return pending[language]!;
}

export const fallbackTable: Table = uz;

const settled: Partial<Record<Written, Promise<Table>>> = {};

/** For React's `use()`: one stable promise per language that never rejects —
 *  a chunk that fails to load leaves the Uzbek strings in place. */
export function tablePromise(language: Written): Promise<Table> {
  settled[language] ??= loadTable(language).catch(() => {
    delete settled[language];
    return fallbackTable;
  });
  return settled[language]!;
}
