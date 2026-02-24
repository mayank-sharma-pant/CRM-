import sys, os, traceback
sys.path.insert(0, '.')

try:
    from app.database import engine, Base
    
    # Import ALL models so metadata sees them
    from app.models import user, company, company_settings
    try:
        from app.models import lead, client, task, follow_up, invoice, note, team, ledger, leave
    except Exception as e:
        with open("seed_error.txt", "a") as f:
            f.write(f"Model import warning: {e}\n")

    print("Creating tables...", flush=True)
    Base.metadata.create_all(bind=engine)
    print("Tables created!", flush=True)
    
    from sqlalchemy.orm import Session
    from app.models.company import Company
    from app.models.user import User
    from app.utils.security import get_password_hash

    db = Session(engine)
    
    # Company
    c = Company(name='SunEdge CRM', status='active', plan='enterprise')
    db.add(c)
    db.flush()
    print(f'Company id={c.id}', flush=True)
    
    # Admin
    print("Hashing admin password...", flush=True)
    h = get_password_hash('admin123')
    print("Password hashed.", flush=True)
    u = User(email='admin@sunedge.com', full_name='CRM Admin', hashed_password=h, role='admin', status='active', company_id=c.id, is_active=True)
    db.add(u)
    print("Admin added.", flush=True)
    
    # Other roles
    for role, email, name in [('md','md@sunedge.com','Managing Director'),('manager','manager@sunedge.com','Sales Manager'),('sales','sales@sunedge.com','Sales Executive'),('purchase','purchase@sunedge.com','Purchase Officer')]:
        h2 = get_password_hash('test123')
        u2 = User(email=email, full_name=name, hashed_password=h2, role=role, status='active', company_id=c.id, is_active=True)
        db.add(u2)
        print(f'{role} created', flush=True)
    
    db.commit()
    db.close()
    print('\nDONE! All users created.', flush=True)
    print('Admin:    admin@sunedge.com / admin123')
    print('MD:       md@sunedge.com / test123')
    print('Manager:  manager@sunedge.com / test123')
    print('Sales:    sales@sunedge.com / test123')
    print('Purchase: purchase@sunedge.com / test123')

except Exception as e:
    with open("seed_error.txt", "w") as f:
        traceback.print_exc(file=f)
    print(f"FAILED: {e}")
    print("See seed_error.txt for details")
    sys.exit(1)
