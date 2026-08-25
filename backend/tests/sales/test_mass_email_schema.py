from app.models.sales.mass_email import MassEmailBlast


def test_blast_columns():
    cols = {c.name for c in MassEmailBlast.__table__.columns}
    assert cols == {
        "id", "company_id", "subject", "audience", "sent_by_id",
        "sent_count", "failed_count", "skipped_count", "sent_at",
    }


def test_blast_persists(db):
    row = MassEmailBlast(
        company_id=1, subject="Hi", audience="leads",
        sent_count=2, failed_count=0, skipped_count=1,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    assert row.id is not None
    assert row.sent_count == 2
