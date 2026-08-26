const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { translate, catalogs, SUPPORTED_LOCALES } = require("./translate.cjs");

const hi = catalogs.hi;
const DEVANAGARI = /[ऀ-ॿ]/;

test("every hi key is a non-empty string that differs from its English source", () => {
  const entries = Object.entries(hi);
  assert.ok(entries.length > 0, "hi catalog should not be empty");
  for (const [src, val] of entries) {
    assert.strictEqual(typeof val, "string", `value for "${src}" must be a string`);
    assert.ok(val.trim().length > 0, `value for "${src}" must be non-empty`);
    assert.notStrictEqual(val, src, `value for "${src}" must be translated, not a copy`);
  }
});

test("hi values are Devanagari for a sampled set of core keys", () => {
  for (const key of ["Leads", "Deals", "Invoices", "Clients", "Dashboard"]) {
    assert.ok(hi[key], `"${key}" should be in the hi catalog`);
    assert.ok(DEVANAGARI.test(hi[key]), `"${key}" → "${hi[key]}" should be Devanagari`);
  }
});

test("translate('hi', key) returns the Hindi value", () => {
  assert.strictEqual(translate("hi", "Leads"), hi["Leads"]);
});

test("translate('hi', missing) falls back to the English source", () => {
  const src = "A string that is definitely not in the catalog 12345";
  assert.strictEqual(translate("hi", src), src);
});

test("translate('en', key) returns the source unchanged (identity default)", () => {
  assert.strictEqual(translate("en", "Leads"), "Leads");
});

test("translate on unknown locale is identity", () => {
  assert.strictEqual(translate("fr", "Leads"), "Leads");
});

test("translate passes null/undefined through", () => {
  assert.strictEqual(translate("hi", null), null);
  assert.strictEqual(translate("hi", undefined), undefined);
});

test("SUPPORTED_LOCALES is en + hi", () => {
  assert.deepStrictEqual(SUPPORTED_LOCALES, ["en", "hi"]);
});

test("hi.cjs source has no duplicate keys (objects would silently merge them)", () => {
  const src = fs.readFileSync(path.join(__dirname, "hi.cjs"), "utf8");
  const keys = [...src.matchAll(/^\s*(?:"([^"]+)"|([A-Za-z][\w]*))\s*:/gm)]
    .map((m) => m[1] || m[2]);
  const seen = new Set();
  const dups = [];
  for (const k of keys) {
    if (seen.has(k)) dups.push(k);
    seen.add(k);
  }
  assert.deepStrictEqual(dups, [], `duplicate keys: ${dups.join(", ")}`);
});
