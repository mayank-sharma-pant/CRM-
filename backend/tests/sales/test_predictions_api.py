from datetime import datetime, timedelta
from app.models.sales.deal import Deal
from app.models.sales.pipeline import Pipeline, PipelineStage
from app.models.sales.client import Client
from app.models.finance.invoice import Invoice
from app.models.core.enums import DealStageType
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def _login(client, db, code, role="admin"):
    company = create_company(db, name=f"Co {code}", company_code=code)
    user = create_active_user(db, email=f"{role}@{code.lower()}.com",
                              role=role, company_id=company.id)
    login_user(client, user.email)
    return company, user


def _closed_deals(db, company_id):
    p = Pipeline(company_id=company_id, name="P"); db.add(p); db.flush()
    won = PipelineStage(company_id=company_id, pipeline_id=p.id, name="Won", position=3, stage_type=DealStageType.WON)
    lost = PipelineStage(company_id=company_id, pipeline_id=p.id, name="Lost", position=4, stage_type=DealStageType.LOST)
    db.add_all([won, lost]); db.flush()
    for src, wins in [("A", 8), ("B", 2)]:
        for i in range(10):
            db.add(Deal(company_id=company_id, title=f"{src}{i}", amount=1000 * (i + 1),
                        pipeline_id=p.id, stage_id=(won.id if i < wins else lost.id),
                        source=src, closed_at=datetime.utcnow()))
    db.commit()


def test_train_and_models(client, db):
    company, _ = _login(client, db, "PA1")
    _closed_deals(db, company.id)
    resp = client.post("/api/predictions/train", json={"kind": "deal_convert"})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["sample_count"] == 20
    assert body["model"] == "trained"
    models = client.get("/api/predictions/models").json()
    assert any(m["kind"] == "deal_convert" for m in models["items"])


def test_sales_cannot_train(client, db):
    _login(client, db, "PA2", role="sales")
    assert client.post("/api/predictions/train", json={"kind": "deal_convert"}).status_code == 403


def test_churn_list_ranks_overdue_first(client, db):
    company, _ = _login(client, db, "PA3")
    c1 = Client(company_id=company.id, name="Overdue")
    c2 = Client(company_id=company.id, name="Fresh")
    db.add_all([c1, c2]); db.flush()
    now = datetime.utcnow()
    n = 0
    for cl, days in ((c1, (210, 180, 150)), (c2, (60, 30, 1))):
        for d in days:
            n += 1
            db.add(Invoice(company_id=company.id, client_id=cl.id, total=100,
                           invoice_number=f"INV-PA3-{n}",
                           created_at=now - timedelta(days=d)))
    db.commit()
    rows = client.get("/api/predictions/churn").json()["items"]
    assert rows[0]["client_id"] == c1.id
    assert rows[0]["band"] == "high"
