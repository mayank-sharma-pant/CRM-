const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const PAGE = fs.readFileSync(
  path.join(__dirname, "..", "app", "page.jsx"),
  "utf8"
);

const FORBIDDEN = [
  "Mike Thompson",
  "Sarah Chen",
  "David Brooks",
  "Thompson HVAC",
  "Premier Plumbing",
  "Brooks Electric",
  "Revenue is up 40%",
  "hundreds of service businesses",
  "Trusted by service businesses",
  "id=\"testimonials\"",
  "Stripe",
  "QuickBooks",
  "Slack",
  "Zapier",
  "schedule jobs",
  "marketing dollars",
  "href=\"#\"",
];

test("landing page has no fabricated social proof or unshipped integrations", () => {
  for (const phrase of FORBIDDEN) {
    assert.equal(
      PAGE.includes(phrase),
      false,
      `forbidden landing copy still present: ${phrase}`
    );
  }
});
