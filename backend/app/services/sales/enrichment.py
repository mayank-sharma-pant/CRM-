"""Domain-stub data enrichment (no live Clearbit)."""
from datetime import datetime, timezone
from urllib.parse import urlparse

from fastapi import HTTPException

CONSUMER_HOSTS = frozenset({
    "gmail.com",
    "googlemail.com",
    "yahoo.com",
    "ymail.com",
    "outlook.com",
    "hotmail.com",
    "live.com",
    "msn.com",
    "icloud.com",
    "me.com",
    "rediffmail.com",
    "proton.me",
    "protonmail.com",
    "aol.com",
})


def _strip_www(host: str) -> str:
    host = host.lower().rstrip(".")
    if host.startswith("www."):
        return host[4:]
    return host


def host_from(*, email: str | None = None, website: str | None = None) -> str | None:
    if email and "@" in email:
        host = _strip_www(email.rsplit("@", 1)[1].strip())
        if host and "." in host and host not in CONSUMER_HOSTS:
            return host
    if website:
        raw = website.strip()
        if raw and "://" not in raw:
            raw = "https://" + raw
        parsed = urlparse(raw)
        host = _strip_www(parsed.hostname or "")
        if host and host not in CONSUMER_HOSTS:
            return host
    return None


def suggest(host: str) -> dict:
    label = host.split(".")[0]
    if host.endswith(".edu") or host.endswith(".ac.in"):
        industry = "Education"
    elif host.endswith(".gov") or host.endswith(".gov.in"):
        industry = "Government"
    else:
        industry = "Services"
    return {
        "company": label.replace("-", " ").title(),
        "website": f"https://{host}",
        "industry": industry,
        "linkedin_url": f"https://www.linkedin.com/company/{label}",
        "source": "domain",
    }


def require_host(*, email: str | None = None, website: str | None = None) -> str:
    host = host_from(email=email, website=website)
    if not host:
        raise HTTPException(status_code=400, detail="Work email or website required")
    return host


def _empty(value) -> bool:
    return value is None or (isinstance(value, str) and not value.strip())


def fill_blanks(target, mapping: dict) -> None:
    for attr, value in mapping.items():
        if _empty(getattr(target, attr, None)):
            setattr(target, attr, value)


def stamp(target, source: str) -> None:
    target.enrichment_source = source
    target.enriched_at = datetime.now(timezone.utc)


def apply_lead(db, lead, user_id: int):
    if lead.enriched_at:
        return lead
    host = require_host(email=lead.email, website=lead.website)
    data = suggest(host)
    fill_blanks(lead, {
        "company": data["company"],
        "website": data["website"],
        "industry": data["industry"],
        "linkedin_url": data["linkedin_url"],
    })
    stamp(lead, data["source"])
    from app.models.sales.note import Note
    db.add(Note(
        company_id=lead.company_id,
        lead_id=lead.id,
        created_by_id=user_id,
        content=f"Enriched from domain {host}",
    ))
    db.commit()
    db.refresh(lead)
    return lead


def apply_account(db, account):
    if account.enriched_at:
        return account
    host = require_host(website=account.website)
    data = suggest(host)
    fill_blanks(account, {
        "website": data["website"],
        "industry": data["industry"],
        "linkedin_url": data["linkedin_url"],
    })
    stamp(account, data["source"])
    db.commit()
    db.refresh(account)
    return account
