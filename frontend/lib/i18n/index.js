/** ESM entry for the i18n core. Implementation lives in the .cjs files so the
 *  node --test suite and the app share one source. */
export { translate, catalogs, SUPPORTED_LOCALES } from "./translate.cjs";
