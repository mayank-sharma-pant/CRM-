/**
 * Locale-agnostic translation core (Phase 7.4). CommonJS so the .cjs test and
 * the ESM app (via lib/i18n/index.js) share one implementation.
 *
 * Message ids are the English source string; a missing key falls back to the
 * source, so untranslated strings render in English rather than showing a raw
 * key. Locale "en" has no catalog (identity).
 */
const hi = require("./hi.cjs");

const catalogs = { hi };

const SUPPORTED_LOCALES = ["en", "hi"];

function translate(locale, source) {
  if (source == null) return source;
  const catalog = catalogs[locale];
  if (!catalog) return source; // en or unknown locale → identity
  const value = catalog[source];
  return value == null ? source : value;
}

module.exports = { catalogs, translate, SUPPORTED_LOCALES };
