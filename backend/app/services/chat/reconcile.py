"""Bring chat files on disk and chat_attachments rows back in line after a crash or restore.

- Orphan files (on disk, no row; e.g. a crash between moving the file and the commit)
  older than an hour are moved to orphans/, and deleted from there after a week.
- Missing files (row, no file; e.g. disk restored from an older snapshot) are only
  reported: the download endpoint already answers 404 and the UI shows "unavailable".
- Abandoned temp uploads older than an hour are deleted.

Dry run unless apply=True.
"""
from __future__ import annotations

import os
import re
import time

from sqlalchemy.orm import Session

from app.models.core.chat import ChatAttachment
from app.services.chat import files

ORPHAN_MIN_AGE = 3600
ORPHAN_KEEP = 7 * 86400
_STORED_NAME = re.compile(r"^[0-9a-f]{32}$")


def _stored_files(directory: str) -> dict[str, float]:
    out: dict[str, float] = {}
    try:
        with os.scandir(directory) as entries:
            for entry in entries:
                if entry.is_file(follow_symlinks=False) and _STORED_NAME.match(entry.name):
                    out[entry.name] = entry.stat().st_mtime
    except FileNotFoundError:
        pass
    return out


def reconcile(db: Session, apply: bool = False, now: float | None = None) -> dict:
    now = time.time() if now is None else now
    on_disk = _stored_files(files.files_dir())
    rows = db.query(ChatAttachment.id, ChatAttachment.conversation_id, ChatAttachment.stored_name).all()
    known = {stored for _, _, stored in rows}

    orphans = sorted(name for name, mtime in on_disk.items() if name not in known and now - mtime > ORPHAN_MIN_AGE)
    missing = [
        {"attachment_id": att_id, "conversation_id": conv_id}
        for att_id, conv_id, stored in rows
        if stored not in on_disk
    ]
    expired_orphans = sorted(
        name for name, mtime in _stored_files(files.orphans_dir()).items() if now - mtime > ORPHAN_KEEP
    )

    temp_removed = 0
    if apply:
        files.ensure_dirs()
        for name in orphans:
            os.replace(os.path.join(files.files_dir(), name), os.path.join(files.orphans_dir(), name))
        for name in expired_orphans:
            files.discard(os.path.join(files.orphans_dir(), name))
        temp_removed = files.sweep_tmp()

    return {
        "applied": apply,
        "files_on_disk": len(on_disk),
        "attachment_rows": len(rows),
        "orphans_quarantined" if apply else "orphans_found": len(orphans),
        "expired_orphans_deleted" if apply else "expired_orphans_found": len(expired_orphans),
        "missing_files": missing,
        "temp_files_removed": temp_removed,
    }
