from app.models.sales.marketplace import MarketplaceInstall


def test_install_columns():
    cols = {c.name for c in MarketplaceInstall.__table__.columns}
    assert cols == {
        "id", "company_id", "app_slug", "status",
        "installed_by_id", "installed_at", "updated_at",
    }


def test_install_persists(db):
    row = MarketplaceInstall(
        company_id=1, app_slug="scoring", status="installed",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    assert row.id is not None
    assert row.app_slug == "scoring"
    assert row.status == "installed"
