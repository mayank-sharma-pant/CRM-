/**
 * Pure helpers for chat file sharing (no React, no DOM) so they can be unit-tested with node --test.
 * The server re-checks everything; these only give fast, friendly feedback.
 */

const CATEGORY_LABELS = { image: 'Photo', video: 'Video', audio: 'Audio', file: 'File' };

// Keep in step with backend/app/services/chat/filetypes.py (inline categories only; anything else allowed is a "file").
const EXT_CATEGORY = {
  '.jpg': 'image', '.jpeg': 'image', '.png': 'image', '.gif': 'image', '.webp': 'image',
  '.mp4': 'video', '.m4v': 'video', '.mov': 'video', '.webm': 'video',
  '.mp3': 'audio', '.m4a': 'audio', '.ogg': 'audio', '.oga': 'audio', '.opus': 'audio', '.weba': 'audio', '.wav': 'audio',
};

const REFRESH_MARGIN_MS = 2 * 60 * 1000;

function extensionOf(name) {
  const lower = String(name || '').toLowerCase();
  const dot = lower.lastIndexOf('.');
  return dot > 0 ? lower.slice(dot) : '';
}

function fileCategory(name) {
  return EXT_CATEGORY[extensionOf(name)] || 'file';
}

function attachmentLabel(category) {
  return CATEGORY_LABELS[category] || CATEGORY_LABELS.file;
}

function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  const mb = n / (1024 * 1024);
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

/**
 * Check a picked file against the limits from /chat/status `files`.
 * Returns { ok: true, category } or { ok: false, reason: 'type' | 'size' | 'empty', limit? }.
 */
function checkFile(file, limits) {
  const name = file && file.name;
  const size = Number(file && file.size) || 0;
  const accept = (limits && limits.accept) || [];
  if (!accept.includes(extensionOf(name))) return { ok: false, reason: 'type' };
  if (size <= 0) return { ok: false, reason: 'empty' };
  const category = fileCategory(name);
  const limit = category === 'video' || category === 'audio' ? limits.max_media_bytes : limits.max_doc_bytes;
  if (size > limit) return { ok: false, reason: 'size', limit };
  return { ok: true, category };
}

/** UTF-8 text → unpadded base64url, for the X-File-Name / X-Caption upload headers. */
function encodeHeader(text) {
  const bytes = new TextEncoder().encode(String(text));
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Attachment ids whose download link expires within `marginMs` (expiry is in epoch seconds). */
function expiringAttachmentIds(messages, nowMs, marginMs = REFRESH_MARGIN_MS) {
  const ids = [];
  for (const m of messages || []) {
    const att = m && m.attachment;
    if (att && Number.isInteger(att.id) && Number(att.url_expires_at) * 1000 - nowMs < marginMs) ids.push(att.id);
  }
  return ids;
}

/** Return messages with fresh links applied; untouched messages keep their identity. */
function applyLinks(messages, links) {
  if (!links || !Object.keys(links).length) return messages;
  let changed = false;
  const next = (messages || []).map((m) => {
    const fresh = m && m.attachment && links[String(m.attachment.id)];
    if (!fresh || fresh.url === m.attachment.url) return m;
    changed = true;
    return { ...m, attachment: { ...m.attachment, url: fresh.url, url_expires_at: fresh.url_expires_at } };
  });
  return changed ? next : messages;
}

module.exports = {
  CATEGORY_LABELS,
  REFRESH_MARGIN_MS,
  extensionOf,
  fileCategory,
  attachmentLabel,
  formatBytes,
  checkFile,
  encodeHeader,
  expiringAttachmentIds,
  applyLinks,
};
