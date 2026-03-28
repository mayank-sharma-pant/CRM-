# Python script to fix purchase.py without fuzzy matching risks
with open('app/routers/finance/purchase.py', 'r', encoding='utf-8') as f:
    content = f.read()

create_old = """    # Generate invoice number
    settings = db.query(CompanySettings).filter(CompanySettings.company_id == current_user.company_id).first()
    prefix = (settings.invoice_prefix or "INV").strip() if settings and settings.invoice_prefix else "INV"
    prefix = prefix or "INV"
    
    count = apply_company_scope(db.query(Invoice), Invoice, current_user).count()
    inv_number = f"{prefix}-{current_user.company_id:03d}-{count + 1:04d}"
    
    # Robust collision guard against concurrent creates or deleted invoices
    while apply_company_scope(db.query(Invoice), Invoice, current_user).filter(Invoice.invoice_number == inv_number).first():
        count += 1
        inv_number = f"{prefix}-{current_user.company_id:03d}-{count + 1:04d}\""""

create_new = """    import uuid
    inv_number = f"DRAFT-{uuid.uuid4().hex[:8].upper()}\""""

content = content.replace(create_old, create_new)

approve_old = """    invoice.status = InvoiceStatus.PENDING  # Move from Draft to Pending (sent to client)
    db.commit()"""

approve_new = """    if invoice.invoice_number and invoice.invoice_number.startswith("DRAFT-"):
        from app.models.core.company_settings import CompanySettings
        settings = db.query(CompanySettings).filter(CompanySettings.company_id == current_user.company_id).first()
        prefix = (settings.invoice_prefix or "INV").strip() if settings and settings.invoice_prefix else "INV"
        prefix = prefix or "INV"
        
        count = apply_company_scope(db.query(Invoice), Invoice, current_user).filter(Invoice.invoice_number.not_ilike("DRAFT-%")).count()
        new_number = f"{prefix}-{current_user.company_id:03d}-{count + 1:04d}"
        
        while apply_company_scope(db.query(Invoice), Invoice, current_user).filter(Invoice.invoice_number == new_number).first():
            count += 1
            new_number = f"{prefix}-{current_user.company_id:03d}-{count + 1:04d}"
            
        invoice.invoice_number = new_number

    invoice.status = InvoiceStatus.PENDING  # Move from Draft to Pending (sent to client)
    db.commit()"""

content = content.replace(approve_old, approve_new)

with open('app/routers/finance/purchase.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated purchase.py successfully!")
