from app.models import Lead
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def test_md_points_are_auto_calculated_from_lead_performance(client, db):
    company = create_company(db, name='AutoPoints Co', company_code='APC')

    md_user = create_active_user(
        db,
        email='md@apc.com',
        role='md',
        company_id=company.id,
        full_name='Auto MD',
    )
    sales_user = create_active_user(
        db,
        email='sales@apc.com',
        role='sales',
        company_id=company.id,
        full_name='Auto Sales',
    )

    db.add_all(
        [
            Lead(company_id=company.id, name='Lead 1', status='Converted', assigned_to_id=sales_user.id),
            Lead(company_id=company.id, name='Lead 2', status='Converted', assigned_to_id=sales_user.id),
            Lead(company_id=company.id, name='Lead 3', status='New', assigned_to_id=sales_user.id),
        ]
    )
    db.commit()

    login_user(client, md_user.email)
    response = client.get('/api/md/points')
    assert response.status_code == 200, response.text

    data = response.json()
    employee = next((p for p in data['performance'] if p['user_id'] == sales_user.id), None)
    assert employee is not None

    expected_points = 2 * 500 + 1 * 50
    assert employee['points'] == expected_points
    assert employee['tier'] == 'Gold'
    assert employee['bonus'] == f'₹{expected_points * 5:,}'

    assert data['summary']['totalPoints'] >= expected_points


def test_non_md_cannot_access_md_points(client, db):
    company = create_company(db, name='No Access Co', company_code='NAC')
    sales_user = create_active_user(
        db,
        email='sales@nac.com',
        role='sales',
        company_id=company.id,
    )

    login_user(client, sales_user.email)
    response = client.get('/api/md/points')
    assert response.status_code == 403
