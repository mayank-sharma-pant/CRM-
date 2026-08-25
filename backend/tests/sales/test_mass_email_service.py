from datetime import datetime, timezone
from unittest.mock import patch

import pytest
from fastapi import HTTPException

from app.models.sales.lead import Lead
from app.models.sales.mass_email import MassEmailBlast
from app.services.sales.mass_email import MAX_PER_DAY, MAX_RECIPIENTS, send_mass_email
from tests.helpers.factories import create_company


def _lead(db, company_id, name, email=None):
    row = Lead(company_id=company_id, name=name, email=email, status="Active")
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@patch("app.services.sales.mass_email.deliver_and_log")
def test_send_audience_leads(mock_deliver, db):
    company = create_company(db, name="Co", company_code="ME1")
    _lead(db, company.id, "A", "a@x.com")
    _lead(db, company.id, "B")
    mock_deliver.return_value.status = "sent"
    mock_deliver.return_value.id = 1
    result = send_mass_email(
        db, company.id, subject="Hi", body="Hello",
        audience="leads", lead_ids=None, client_ids=None, sent_by_id=None,
    )
    assert result["sent"] == 1
    assert result["skipped"] == 1
    mock_deliver.assert_called_once()


def test_over_blast_cap(db):
    company = create_company(db, name="Co", company_code="ME2")
    for i in range(MAX_RECIPIENTS + 1):
        _lead(db, company.id, f"L{i}", f"l{i}@x.com")
    with pytest.raises(HTTPException) as ei:
        send_mass_email(
            db, company.id, subject="Hi", body="Hello",
            audience="leads", lead_ids=None, client_ids=None, sent_by_id=None,
        )
    assert ei.value.status_code == 400


def test_daily_cap(db):
    company = create_company(db, name="Co", company_code="ME3")
    _lead(db, company.id, "A", "a@x.com")
    db.add(MassEmailBlast(
        company_id=company.id, subject="Prior", audience="leads",
        sent_count=MAX_PER_DAY, failed_count=0, skipped_count=0,
        sent_at=datetime.now(timezone.utc),
    ))
    db.commit()
    with pytest.raises(HTTPException) as ei:
        send_mass_email(
            db, company.id, subject="Hi", body="Hello",
            audience="leads", lead_ids=None, client_ids=None, sent_by_id=None,
        )
    assert ei.value.status_code == 400


def test_foreign_lead_id_is_400(db):
    a = create_company(db, name="A", company_code="ME4A")
    b = create_company(db, name="B", company_code="ME4B")
    other = _lead(db, b.id, "X", "x@x.com")
    with pytest.raises(HTTPException) as ei:
        send_mass_email(
            db, a.id, subject="Hi", body="Hello",
            audience=None, lead_ids=[other.id], client_ids=None, sent_by_id=None,
        )
    assert ei.value.status_code == 400
