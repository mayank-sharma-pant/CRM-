from app.models.sales.pipeline import Pipeline, PipelineStage
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def _company_with_admin(db, code="C1"):
    company = create_company(db, name=f"Co {code}", company_code=code)
    admin = create_active_user(db, email=f"admin@{code}.com", role="admin", company_id=company.id)
    return company, admin


def test_create_deal_autoseeds_pipeline_and_returns_first_stage(client, db):
    company, admin = _company_with_admin(db)
    login_user(client, admin.email)
    resp = client.post("/api/deals", json={"title": "Acme roof", "amount": "50000.00"})
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["title"] == "Acme roof"
    assert body["stage_name"] == "Qualification"
    assert body["effective_probability"] == 10  # from stage default
    # pipeline got auto-seeded
    assert db.query(Pipeline).filter(Pipeline.company_id == company.id).count() == 1


def test_create_deal_rejects_negative_amount(client, db):
    company, admin = _company_with_admin(db)
    login_user(client, admin.email)
    resp = client.post("/api/deals", json={"title": "Bad", "amount": "-5"})
    assert resp.status_code == 400


def test_create_deal_rejects_stage_from_other_pipeline(client, db):
    company, admin = _company_with_admin(db)
    login_user(client, admin.email)
    # seed default pipeline via one create
    client.post("/api/deals", json={"title": "seed", "amount": "1"})
    # a foreign stage in a second pipeline
    other = Pipeline(company_id=company.id, name="Other", is_default=False)
    db.add(other); db.flush()
    foreign = PipelineStage(company_id=company.id, pipeline_id=other.id, name="X", position=1, default_probability=0)
    db.add(foreign); db.commit()
    default_pipe = db.query(Pipeline).filter(Pipeline.is_default == True).first()  # noqa: E712
    resp = client.post("/api/deals", json={
        "title": "mismatch", "amount": "1",
        "pipeline_id": default_pipe.id, "stage_id": foreign.id,
    })
    assert resp.status_code == 400


def test_list_get_patch_delete_roundtrip(client, db):
    company, admin = _company_with_admin(db)
    login_user(client, admin.email)
    created = client.post("/api/deals", json={"title": "D1", "amount": "100"}).json()
    did = created["id"]

    assert client.get("/api/deals").json()["total"] == 1
    assert client.get(f"/api/deals/{did}").json()["title"] == "D1"

    patched = client.patch(f"/api/deals/{did}", json={"amount": "250", "probability": 55})
    assert patched.status_code == 200
    assert patched.json()["effective_probability"] == 55  # explicit override wins

    assert client.delete(f"/api/deals/{did}").status_code in (200, 204)
    assert client.get(f"/api/deals/{did}").status_code == 404
