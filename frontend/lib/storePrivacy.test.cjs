const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const read = (...p) => fs.readFileSync(path.join(root, ...p), "utf8");

const PRIVACY = read("app", "privacy", "page.jsx");

// Store review rejects a privacy URL behind auth, and buyers reject dishonest
// copy. These are the same aspirational-vendor / fabricated-scale phrases the
// 6.11 landing-honesty test forbids; the policy must not reintroduce them.
const FORBIDDEN = [
  "Stripe",
  "QuickBooks",
  "Slack",
  "Zapier",
  "hundreds of service businesses",
  "Trusted by service businesses",
];

test("public privacy page exists with the required disclosures", () => {
  const lower = PRIVACY.toLowerCase();
  assert.ok(lower.includes("privacy"), "no privacy heading/text");
  // No auth wall: a store reviewer must load it logged out.
  assert.ok(
    !PRIVACY.includes("useAuth") && !PRIVACY.includes("api.get"),
    "privacy page must not require auth or call the API"
  );
  assert.ok(
    lower.includes("no advertising") || lower.includes("no ads"),
    "must state no advertising SDK"
  );
  assert.ok(
    lower.includes("secure storage"),
    "must state tokens live in secure storage"
  );
  assert.ok(
    PRIVACY.includes("/settings/privacy"),
    "must link to the DPDP retention/export controls"
  );
  assert.ok(
    lower.includes("last updated"),
    "must carry a Last updated date"
  );
  assert.ok(
    lower.includes("@") && lower.includes("perioxia"),
    "must give a contact address"
  );
});

test("privacy page carries no fabricated vendors or scale", () => {
  for (const phrase of FORBIDDEN) {
    assert.equal(
      PRIVACY.includes(phrase),
      false,
      `forbidden copy still present: ${phrase}`
    );
  }
});

test("/privacy is whitelisted in all four public-path gates", () => {
  const gates = [
    ["src", "middleware.ts"],
    ["components", "RouteGuard.jsx"],
    ["components", "Layout.jsx"],
    ["services", "api.js"],
  ];
  for (const g of gates) {
    assert.ok(
      read(...g).includes("/privacy"),
      `${g.join("/")} does not whitelist /privacy`
    );
  }
});

test("store listing metadata respects platform length limits", () => {
  const meta = (...p) =>
    read("..", "flutter_app", "store", "metadata", ...p).trim();
  assert.ok(meta("android", "en-US", "title.txt").length <= 30, "Android title > 30");
  assert.ok(
    meta("android", "en-US", "short_description.txt").length <= 80,
    "Android short description > 80"
  );
  assert.ok(meta("ios", "en-US", "name.txt").length <= 30, "iOS name > 30");
  assert.ok(meta("ios", "en-US", "subtitle.txt").length <= 30, "iOS subtitle > 30");
  assert.ok(
    meta("privacy_url.txt").endsWith("/privacy"),
    "privacy_url.txt must end in /privacy"
  );
});
