# Phase 6.7 implementation plan

## Tests first

`backend/tests/sales/test_whatsapp_inbound.py` — webhook match, duplicate skip,
unknown dest 204, cadence day-1 whatsapp + reminder send, session window.

## Code

- Model columns + `_MISSING_COLUMNS`
- `ingest_gupshup_inbound`, `send_template_message`, `session_open_until`,
  `post_gupshup_session_text` in `app/services/sales/whatsapp.py`
- Public webhook + JWT `session-send`; connection DTO includes cadence template
- Cadence + reminders
- Settings + lead panel session box
- Timeline snippet uses `body` / direction
- Mark 6.7 DONE in IMPLEMENTATION_PLAN
