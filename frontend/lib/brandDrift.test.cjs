const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const frontendRoot = path.join(__dirname, "..");
const repoRoot = path.join(frontendRoot, "..");

function read(relFromFrontend) {
  return fs.readFileSync(path.join(frontendRoot, relFromFrontend), "utf8");
}

test("auth pages and package do not use CRM Inc or local-service package name", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.name, "perioxia-crm-frontend");

  const authFiles = [
    "app/login/page.jsx",
    "app/signup/page.jsx",
    "app/forgot-password/page.jsx",
  ];
  for (const rel of authFiles) {
    const src = read(rel);
    assert.equal(src.includes("CRM Inc"), false, `CRM Inc still in ${rel}`);
    assert.match(src, /Perioxia CRM/);
  }

  const apiMain = fs.readFileSync(
    path.join(repoRoot, "backend", "app", "main.py"),
    "utf8"
  );
  assert.match(apiMain, /title="Perioxia CRM API"/);
  assert.match(apiMain, /Perioxia CRM API is running/);
  assert.equal(apiMain.includes('title="CRM API"'), false);
});
