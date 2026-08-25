from app.models.sales.client import Client
from app.models.sales.deal import Deal
from app.models.sales.pipeline import Pipeline, PipelineStage
from app.models.core.enums import DealStageType
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def _admin(client, db, code):
    company = create_company(db, name=f"Co {code}", company_code=code)
    admin = create_active_user(db, email=f"admin@{code.lower()}.com",
                               role="admin", company_id=company.id)
    return company, admin


def test_foreign_deal_prediction_and_client_churn_404(client, db):
    company_a, admin_a = _admin(client, db, "PXA")
    company_b, admin_b = _admin(client, db, "PXB")
    p = Pipeline(company_id=company_a.id, name="P"); db.add(p); db.flush()
    open_ = PipelineStage(company_id=company_a.id, pipeline_id=p.id, name="New",
                          position=1, stage_type=DealStageType.OPEN)
    db.add(open_); db.flush()
    deal = Deal(company_id=company_a.id, title="x", amount=1,
                pipeline_id=p.id, stage_id=open_.id, source="A")
    cl = Client(company_id=company_a.id, name="A")
    db.add_all([deal, cl]); db.commit()

    login_user(client, admin_b.email)
    assert client.get(f"/api/deals/{deal.id}/prediction").status_code == 404
    assert client.get(f"/api/clients/{cl.id}/churn").status_code == 404

    login_user(client, admin_a.email)  # positive controls
    assert client.get(f"/api/deals/{deal.id}/prediction").status_code == 200
    assert client.get(f"/api/clients/{cl.id}/churn").status_code == 200


def test_train_is_company_scoped(client, db):
    company_a, admin_a = _admin(client, db, "PXC")
    company_b, admin_b = _admin(client, db, "PXD")
    login_user(client, admin_a.email)
    client.post("/api/predictions/train", json={"kind": "deal_convert"})
    login_user(client, admin_b.email)
    models = client.get("/api/predictions/models").json()["items"]
    assert models == []
