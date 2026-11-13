/**
 * Webpack loader: one language out of `src/i18n/messages.ts` (QA H-02).
 *
 * The dictionary is written with all three languages side by side — that is
 * what keeps them from drifting apart, and it stays the single source. But
 * shipping it whole made every page download Russian and English for a woman
 * reading Uzbek (~110 KB gzip on every route). Imported as
 * `./messages?locale=ru`, this loader evaluates the dictionary at build time
 * and emits only `{ key: "ru text" }`, so each language is its own chunk:
 * Uzbek (the default) is bundled, Russian and English load on demand.
 *
 * `messages.ts` must stay self-contained (no imports): it is evaluated here in
 * an empty sandbox. Edits to it rebuild in `next dev` like any other module.
 */
const vm = require("node:vm");
const ts = require("typescript");

const LANGUAGES = new Set(["uz", "ru", "en"]);

function tableFor(source, locale) {
  if (!LANGUAGES.has(locale)) throw new Error(`i18n-locale-loader: unknown locale "${locale}"`);
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const module = { exports: {} };
  vm.runInNewContext(outputText, {
    module,
    exports: module.exports,
    require: (name) => {
      throw new Error(`i18n-locale-loader: messages.ts must not import (${name})`);
    },
  });
  const messages = module.exports.messages;
  if (!messages || typeof messages !== "object") {
    throw new Error("i18n-locale-loader: messages.ts must export `messages`");
  }
  const table = {};
  for (const [key, entry] of Object.entries(messages)) {
    const text = entry && entry[locale];
    if (typeof text === "string") table[key] = text;
  }
  return table;
}

function loader(source) {
  const locale = new URLSearchParams((this.resourceQuery || "").replace(/^\?/, "")).get("locale");
  return `export default ${JSON.stringify(tableFor(source, locale))};\n`;
}

module.exports = loader;
module.exports.tableFor = tableFor;
