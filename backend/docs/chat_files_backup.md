# Chat files: backup, restore and daily check

Chat attachments are stored on the API server's own disk; their metadata is in the
`chat_attachments` table (Neon). The two must be backed up and restored together.

| What | Where |
|---|---|
| Files | `CHAT_FILES_DIR` (production: `/home/ubuntu/chat-files`, mode 700, owner `ubuntu`). One file per attachment, named by a random 32-hex id. |
| Metadata | `chat_attachments` rows (filename and caption are encrypted with `CHAT_ENCRYPTION_KEY`). |
| Temp uploads | `CHAT_FILES_DIR/tmp/` — deleted automatically after 1 hour. |
| Quarantine | `CHAT_FILES_DIR/orphans/` — files with no row, kept 7 days, then deleted. |

## 1. Backups (required before `CHAT_FILES_ENABLED=true`)

The instance's root EBS volume holds the files. Back it up with an AWS Data Lifecycle Manager policy:

1. AWS console → EC2 → Elastic Block Store → Lifecycle Manager → **Create lifecycle policy** → *EBS snapshot policy*.
2. Target: the API instance's root volume (tag the volume, e.g. `Backup=crm-api`, and target that tag).
3. Schedule: every 24 hours; retain 7 snapshots.
4. Create, then wait for the first snapshot and confirm it shows **completed** under Snapshots.

Neon keeps the database history separately (point-in-time restore). Check the restore window on the current Neon plan; it must cover at least the time between two snapshots.

## 2. Daily consistency check

`scripts/chat_files_reconcile.py` compares files with rows. Dry run (changes nothing):

```bash
cd /home/ubuntu/CRM-/backend && venv/bin/python scripts/chat_files_reconcile.py
```

`--apply` moves orphan files (older than 1 hour, no row) to `orphans/`, deletes quarantined files older than 7 days and stale temp files. Rows are never deleted: a row whose file is missing is only reported, and the app shows "File unavailable" for it. Exit code 2 means missing files were found.

Run it daily with a systemd timer:

```ini
# /etc/systemd/system/chat-files-reconcile.service
[Unit]
Description=Chat files consistency check

[Service]
Type=oneshot
User=ubuntu
WorkingDirectory=/home/ubuntu/CRM-/backend
ExecStart=/home/ubuntu/CRM-/backend/venv/bin/python scripts/chat_files_reconcile.py --apply
SuccessExitStatus=2
```

```ini
# /etc/systemd/system/chat-files-reconcile.timer
[Unit]
Description=Daily chat files consistency check

[Timer]
OnCalendar=*-*-* 03:30:00
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl daemon-reload && sudo systemctl enable --now chat-files-reconcile.timer
journalctl -u chat-files-reconcile.service -n 50   # last report
```

## 3. Restore

**Only the files were lost or damaged (database is fine):**

1. Set `CHAT_FILES_ENABLED=false` in `.env` and restart the backend (text chat keeps working).
2. EC2 → Snapshots → pick the latest good snapshot → **Create volume** in the instance's availability zone → **Attach** to the instance (e.g. `/dev/sdf`).
3. Mount it read-only and copy the files back:
   ```bash
   lsblk                                   # find the new device, e.g. nvme1n1p1
   sudo mkdir -p /mnt/restore && sudo mount -o ro /dev/nvme1n1p1 /mnt/restore
   sudo rsync -a --ignore-existing /mnt/restore/home/ubuntu/chat-files/ /home/ubuntu/chat-files/
   sudo chown -R ubuntu:ubuntu /home/ubuntu/chat-files && chmod 700 /home/ubuntu/chat-files
   sudo umount /mnt/restore
   ```
4. Run the check without `--apply` and read the report. Files sent after the snapshot was taken are listed under `missing_files`; they show as "File unavailable" and can't be recovered from this snapshot.
5. Run it again with `--apply`, set `CHAT_FILES_ENABLED=true`, restart, and open a few chats to confirm images load.
6. Detach and delete the temporary volume.

**The whole instance was lost:** restore the instance from the latest snapshot (or launch a new one from it), then follow the normal deploy checks. If the database was also restored to an earlier point (Neon point-in-time restore), restore it to the snapshot's time so the two match, then run step 4–5 above.

## 4. Disk space

Uploads are refused (HTTP 507) when free disk would drop below `CHAT_FILES_MIN_FREE_BYTES` (2 GB) with every upload slot full. Watch usage with:

```bash
df -h / && du -sh /home/ubuntu/chat-files
```
