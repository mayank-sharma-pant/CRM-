from app.models.sales.support_case import SupportCase, WebToCaseForm


def test_case_columns():
    cols = {c.name for c in SupportCase.__table__.columns}
    assert cols == {
        "id", "company_id", "client_id", "subject", "body", "status",
        "requester_name", "requester_email", "source",
        "created_at", "updated_at",
    }


def test_form_columns():
    cols = {c.name for c in WebToCaseForm.__table__.columns}
    assert cols == {"id", "company_id", "slug", "is_active", "created_at"}


def test_case_persists(db):
    row = SupportCase(
        company_id=1, subject="Leak", body="Roof leak", status="open",
        requester_email="a@x.com", source="crm",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    assert row.id is not None
    assert row.status == "open"
