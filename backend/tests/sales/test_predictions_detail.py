from datetime import datetime, timedelta
from app.models.sales.deal import Deal
from app.models.sales.pipeline import Pipeline, PipelineStage
from app.models.sales.client import Client
from app.models.finance.invoice import Invoice
from app.models.core.enums import DealStageType
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def _login(client, db, code):
    company = create_company(db, name=f"Co {code}", company_code=code)
    user = create_active_user(db, email=f"admin@{code.lower()}.com",
                              role="admin", company_id=company.id)
    login_user(client, user.email)
    return company, user


def test_deal_prediction_returns_probability(client, db):
    company, _ = _login(client, db, "PD1")
    p = Pipeline(company_id=company.id, name="P"); db.add(p); db.flush()
    open_ = PipelineStage(company_id=company.id, pipeline_id=p.id, name="New",
                          position=1, stage_type=DealStageType.OPEN)
    db.add(open_); db.flush()
    deal = Deal(company_id=company.id, title="x", amount=1000,
                pipeline_id=p.id, stage_id=open_.id, source="A")
    db.add(deal); db.commit()
    resp = client.get(f"/api/deals/{deal.id}/prediction")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert 0.0 <= body["probability"] <= 1.0
    assert "model" in body


def test_deal_prediction_foreign_404(client, db):
    _login(client, db, "PD2")
    assert client.get("/api/deals/999999/prediction").status_code == 404


def test_client_churn_detail(client, db):
    company, _ = _login(client, db, "PD3")
    c = Client(company_id=company.id, name="Acme"); db.add(c); db.flush()
    now = datetime.utcnow()
    for i, d in enumerate((120, 60)):
        db.add(Invoice(company_id=company.id, client_id=c.id, total=100,
                       invoice_number=f"INV-PD3-{i}",
                       created_at=now - timedelta(days=d)))
    db.commit()
    body = client.get(f"/api/clients/{c.id}/churn").json()
    assert body["invoice_count"] == 2
    assert body["band"] in {"low", "med", "high"}


def test_client_churn_foreign_404(client, db):
    _login(client, db, "PD4")
    assert client.get("/api/clients/999999/churn").status_code == 404
