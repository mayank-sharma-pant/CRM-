const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  fileCategory,
  attachmentLabel,
  formatBytes,
  checkFile,
  encodeHeader,
  expiringAttachmentIds,
  applyLinks,
} = require("./chatMedia.cjs");

const LIMITS = {
  max_doc_bytes: 10 * 1024 * 1024,
  max_media_bytes: 25 * 1024 * 1024,
  accept: [".jpg", ".png", ".mp4", ".mp3", ".pdf", ".heic"],
};

test("fileCategory follows the extension", () => {
  assert.equal(fileCategory("Site Visit.JPG"), "image");
  assert.equal(fileCategory("clip.mov"), "video");
  assert.equal(fileCategory("note.m4a"), "audio");
  assert.equal(fileCategory("quote.pdf"), "file");
  assert.equal(fileCategory("photo.heic"), "file");
  assert.equal(fileCategory("noextension"), "file");
});

test("attachmentLabel names each category", () => {
  assert.equal(attachmentLabel("image"), "Photo");
  assert.equal(attachmentLabel("audio"), "Audio");
  assert.equal(attachmentLabel("unknown"), "File");
});

test("formatBytes is human readable", () => {
  assert.equal(formatBytes(500), "500 B");
  assert.equal(formatBytes(2048), "2 KB");
  assert.equal(formatBytes(1.5 * 1024 * 1024), "1.5 MB");
  assert.equal(formatBytes(25 * 1024 * 1024), "25 MB");
});

test("checkFile applies type and per-category size limits", () => {
  assert.deepEqual(checkFile({ name: "a.jpg", size: 1000 }, LIMITS), { ok: true, category: "image" });
  assert.deepEqual(checkFile({ name: "a.svg", size: 10 }, LIMITS), { ok: false, reason: "type" });
  assert.deepEqual(checkFile({ name: "a.pdf", size: 0 }, LIMITS), { ok: false, reason: "empty" });
  assert.deepEqual(checkFile({ name: "a.jpg", size: 11 * 1024 * 1024 }, LIMITS), { ok: false, reason: "size", limit: LIMITS.max_doc_bytes });
  assert.equal(checkFile({ name: "a.mp4", size: 20 * 1024 * 1024 }, LIMITS).ok, true);
  assert.equal(checkFile({ name: "a.mp4", size: 26 * 1024 * 1024 }, LIMITS).reason, "size");
});

test("encodeHeader is unpadded base64url of UTF-8", () => {
  const encoded = encodeHeader("फोटो? a/b");
  assert.match(encoded, /^[A-Za-z0-9_-]+$/);
  const back = Buffer.from(encoded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  assert.equal(back, "फोटो? a/b");
});

test("expiringAttachmentIds picks links close to expiry", () => {
  const now = 1_000_000_000_000;
  const msgs = [
    { attachment: { id: 1, url_expires_at: now / 1000 + 60 } },
    { attachment: { id: 2, url_expires_at: now / 1000 + 900 } },
    { body: "text only", attachment: null },
    { attachment: { id: 3, url_expires_at: now / 1000 - 5 } },
  ];
  assert.deepEqual(expiringAttachmentIds(msgs, now), [1, 3]);
});

test("applyLinks swaps only refreshed attachments", () => {
  const a = { seq: 1, attachment: { id: 1, url: "old", url_expires_at: 1 } };
  const b = { seq: 2, attachment: { id: 2, url: "keep", url_expires_at: 1 } };
  const c = { seq: 3, body: "hi", attachment: null };
  const out = applyLinks([a, b, c], { 1: { url: "new", url_expires_at: 99 }, 2: { url: "keep", url_expires_at: 1 } });
  assert.equal(out[0].attachment.url, "new");
  assert.equal(out[0].attachment.url_expires_at, 99);
  assert.equal(out[1], b);
  assert.equal(out[2], c);
  const same = [a];
  assert.equal(applyLinks(same, {}), same);
});
