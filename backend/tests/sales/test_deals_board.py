from decimal import Decimal

from app.models.sales.pipeline import Pipeline, PipelineStage
from app.models.core.enums import DealStageType
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def _setup(client, db):
    company = create_company(db, name="Co", company_code="C1")
    admin = create_active_user(db, email="admin@c1.com", role="admin", company_id=company.id)
    login_user(client, admin.email)
    return company, admin


def test_stage_move_sets_and_clears_closed_at(client, db):
    _setup(client, db)
    deal = client.post("/api/deals", json={"title": "D", "amount": "100"}).json()
    won = db.query(PipelineStage).filter(PipelineStage.stage_type == DealStageType.WON).first()
    qual = db.query(PipelineStage).filter(PipelineStage.name == "Qualification").first()

    moved = client.patch(f"/api/deals/{deal['id']}/stage", json={"stage_id": won.id})
    assert moved.status_code == 200
    assert moved.json()["closed_at"] is not None
    assert moved.json()["effective_probability"] == 100  # won default

    back = client.patch(f"/api/deals/{deal['id']}/stage", json={"stage_id": qual.id})
    assert back.json()["closed_at"] is None


def test_stage_move_rejects_foreign_stage(client, db):
    company, _ = _setup(client, db)
    deal = client.post("/api/deals", json={"title": "D", "amount": "100"}).json()
    other = Pipeline(company_id=company.id, name="Other", is_default=False)
    db.add(other); db.flush()
    foreign = PipelineStage(company_id=company.id, pipeline_id=other.id, name="X", position=1, default_probability=0)
    db.add(foreign); db.commit()
    resp = client.patch(f"/api/deals/{deal['id']}/stage", json={"stage_id": foreign.id})
    assert resp.status_code == 400


def test_board_weighted_forecast_arithmetic(client, db):
    _setup(client, db)
    # Two open deals: 100 @ Qualification(10%) -> 10 ; 200 @ Negotiation(70%) -> 140 ; forecast 150
    client.post("/api/deals", json={"title": "A", "amount": "100"})  # Qualification default
    # Pipeline is lazily seeded on first deal creation; look up stages only now.
    stages = {s.name: s for s in db.query(PipelineStage).all()}
    b = client.post("/api/deals", json={"title": "B", "amount": "200"}).json()
    client.patch(f"/api/deals/{b['id']}/stage", json={"stage_id": stages['Negotiation'].id})
    # One won deal: 500 -> won_value 500, not in open forecast
    c = client.post("/api/deals", json={"title": "C", "amount": "500"}).json()
    client.patch(f"/api/deals/{c['id']}/stage", json={"stage_id": stages['Won'].id})

    board = client.get("/api/deals/board").json()
    assert board["open_forecast"] == "150.00"
    assert board["won_value"] == "500.00"
    names = [s["name"] for s in board["stages"]]
    assert names == ["Qualification", "Proposal", "Negotiation", "Won", "Lost"]
