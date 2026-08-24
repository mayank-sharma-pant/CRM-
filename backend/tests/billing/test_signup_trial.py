from app.services.billing.seed import seed_plans
from app.models import Company
from app.models.core.user import User
from app.models.billing import Subscription, Plan


def test_signup_creates_trial_with_subscription(db, client):
    seed_plans(db)
    resp = client.post("/api/auth/signup", json={
        "email": "founder@newco.com", "password": "s3cret-pw", "full_name": "Founder",
        "company_name": "NewCo", "phone": "9999999999",
    })
    assert resp.status_code in (200, 201), resp.text
    company = db.query(Company).filter(Company.name == "NewCo").one()
    assert company.status == "trial"
    assert company.trial_ends_at is not None
    owner = db.query(User).filter(User.email == "founder@newco.com").one()
    assert owner.status == "active"
    sub = db.query(Subscription).filter(Subscription.company_id == company.id).one()
    starter = db.query(Plan).filter(Plan.name == "Starter").one()
    assert sub.plan_id == starter.id and sub.status == "trialing"

    login = client.post("/api/auth/login",
                        data={"username": "founder@newco.com", "password": "s3cret-pw"},
                        headers={"Content-Type": "application/x-www-form-urlencoded"})
    assert login.status_code == 200, login.text  # trial company can log in
