from app.models.sales.lead import Lead
from app.services.billing.seed import seed_plans
from app.services.company.sandbox import create_sandbox
from app.services.sales.pipeline_seed import ensure_default_pipeline
from tests.helpers.auth import create_active_user
from tests.helpers.factories import create_client, create_company


def test_create_clones_leads_and_clients(db):
    seed_plans(db)
    parent = create_company(db, name="Acme", company_code="CL1")
    create_client(db, company_id=parent.id, name="Patel", email="p@x.com")
    db.add(Lead(company_id=parent.id, name="Ravi", email="r@x.com", status="Active"))
    db.commit()
    parent_leads = db.query(Lead).filter(Lead.company_id == parent.id).count()

    sandbox, admin, password, cloned = create_sandbox(db, parent=parent)
    assert cloned["leads"] == 1
    assert cloned["clients"] == 1
    copies = db.query(Lead).filter(Lead.company_id == sandbox.id).all()
    assert len(copies) == 1
    assert copies[0].id != db.query(Lead).filter(Lead.company_id == parent.id).one().id
    assert copies[0].name == "Ravi"
    assert copies[0].assigned_to_id in (None, admin.id)
    assert db.query(Lead).filter(Lead.company_id == parent.id).count() == parent_leads


def test_clone_skips_deleted_leads(db):
    seed_plans(db)
    parent = create_company(db, name="Acme", company_code="CL2")
    from datetime import datetime, timezone
    db.add(Lead(company_id=parent.id, name="Gone", status="Active", deleted_at=datetime.now(timezone.utc)))
    db.commit()
    sandbox, _, _, cloned = create_sandbox(db, parent=parent)
    assert cloned["leads"] == 0
    assert db.query(Lead).filter(Lead.company_id == sandbox.id).count() == 0


def test_clone_remaps_deal_pipeline(db):
    seed_plans(db)
    parent = create_company(db, name="Acme", company_code="CL3")
    admin = create_active_user(db, email="a@cl3.com", role="admin", company_id=parent.id)
    pipe = ensure_default_pipeline(db, parent.id)
    from app.models.sales.deal import Deal
    stage = pipe.stages[0]
    db.add(Deal(
        company_id=parent.id, title="Job", amount=10, pipeline_id=pipe.id,
        stage_id=stage.id, assigned_to_id=admin.id,
    ))
    db.commit()
    sandbox, sadmin, _, cloned = create_sandbox(db, parent=parent)
    assert cloned["deals"] == 1
    copy = db.query(Deal).filter(Deal.company_id == sandbox.id).one()
    assert copy.pipeline_id != pipe.id
    assert copy.assigned_to_id == sadmin.id
    assert copy.title == "Job"
