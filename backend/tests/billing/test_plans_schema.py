from app.models.billing import Plan, Subscription
from app.services.billing.seed import seed_plans


def test_seed_plans_is_idempotent(db):
    seed_plans(db)
    seed_plans(db)  # second call must not duplicate
    names = [p.name for p in db.query(Plan).order_by(Plan.price_monthly).all()]
    assert names == ["Starter", "Growth", "Enterprise"]
    starter = db.query(Plan).filter(Plan.name == "Starter").one()
    assert starter.max_users == 10 and starter.currency == "INR"
    enterprise = db.query(Plan).filter(Plan.name == "Enterprise").one()
    assert enterprise.max_storage_gb is None  # unlimited
