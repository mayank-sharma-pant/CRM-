from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.company import Company
from app.models.finance.invoice import Invoice
from app.models.sales.client import Client
from app.models.sales.quote import Quote
from app.services.portal.share_links import hash_share_token, portal_invoice_dto, portal_quote_dto
from app.utils.rate_limit import portal_limiter

router = APIRouter()


@router.get("/invoices/{token}")
def public_invoice(token: str, request: Request, db: Session = Depends(get_db)):
    portal_limiter.check(request, "portal", max_attempts=60, window_seconds=60)
    token_hash = hash_share_token(token)
    invoice = db.query(Invoice).filter(Invoice.share_token_hash == token_hash).first()
    if invoice is None:
        raise HTTPException(status_code=404, detail="not found")
    client = db.query(Client).filter(Client.id == invoice.client_id).first()
    company = db.query(Company).filter(Company.id == invoice.company_id).first()
    return portal_invoice_dto(invoice, client=client, company=company)


@router.get("/quotes/{token}")
def public_quote(token: str, request: Request, db: Session = Depends(get_db)):
    portal_limiter.check(request, "portal", max_attempts=60, window_seconds=60)
    token_hash = hash_share_token(token)
    quote = db.query(Quote).filter(Quote.share_token_hash == token_hash).first()
    if quote is None:
        raise HTTPException(status_code=404, detail="not found")
    client = db.query(Client).filter(Client.id == quote.client_id).first()
    company = db.query(Company).filter(Company.id == quote.company_id).first()
    return portal_quote_dto(quote, client=client, company=company)
