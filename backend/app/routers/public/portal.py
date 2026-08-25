from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.company import Company
from app.models.finance.invoice import Invoice
from app.models.sales.client import Client
from app.models.sales.quote import Quote
from app.services.finance.invoice_pay import complete_stub_pay, ensure_payment_url
from app.services.portal.share_links import hash_share_token, portal_invoice_dto, portal_quote_dto
from app.services.sales.quote_lifecycle import accept_quote, reject_quote
from app.utils.rate_limit import portal_limiter

router = APIRouter()


def _portal_invoice(db: Session, token: str) -> Invoice:
    invoice = db.query(Invoice).filter(Invoice.share_token_hash == hash_share_token(token)).first()
    if invoice is None:
        raise HTTPException(status_code=404, detail="not found")
    return invoice


def _portal_quote(db: Session, token: str) -> Quote:
    quote = db.query(Quote).filter(Quote.share_token_hash == hash_share_token(token)).first()
    if quote is None:
        raise HTTPException(status_code=404, detail="not found")
    return quote


def _invoice_dto(db: Session, invoice: Invoice) -> dict:
    client = db.query(Client).filter(Client.id == invoice.client_id).first()
    company = db.query(Company).filter(Company.id == invoice.company_id).first()
    return portal_invoice_dto(invoice, client=client, company=company)


def _quote_dto(db: Session, quote: Quote) -> dict:
    client = db.query(Client).filter(Client.id == quote.client_id).first()
    company = db.query(Company).filter(Company.id == quote.company_id).first()
    return portal_quote_dto(quote, client=client, company=company)


@router.get("/invoices/{token}")
def public_invoice(token: str, request: Request, db: Session = Depends(get_db)):
    portal_limiter.check(request, "portal", max_attempts=60, window_seconds=60)
    return _invoice_dto(db, _portal_invoice(db, token))


@router.get("/quotes/{token}")
def public_quote(token: str, request: Request, db: Session = Depends(get_db)):
    portal_limiter.check(request, "portal", max_attempts=60, window_seconds=60)
    return _quote_dto(db, _portal_quote(db, token))


@router.post("/quotes/{token}/accept")
def public_accept_quote(token: str, request: Request, db: Session = Depends(get_db)):
    portal_limiter.check(request, "portal", max_attempts=30, window_seconds=60)
    quote = accept_quote(db, _portal_quote(db, token))
    return _quote_dto(db, quote)


@router.post("/quotes/{token}/reject")
def public_reject_quote(token: str, request: Request, db: Session = Depends(get_db)):
    portal_limiter.check(request, "portal", max_attempts=30, window_seconds=60)
    quote = reject_quote(db, _portal_quote(db, token))
    return _quote_dto(db, quote)


@router.post("/invoices/{token}/pay")
def public_pay_invoice(token: str, request: Request, db: Session = Depends(get_db)):
    portal_limiter.check(request, "portal", max_attempts=30, window_seconds=60)
    invoice = _portal_invoice(db, token)
    url = ensure_payment_url(db, invoice, require_payable=True)
    return {"payment_url": url}


@router.post("/pay-stub/{pay_token}")
def public_complete_stub_pay(pay_token: str, request: Request, db: Session = Depends(get_db)):
    portal_limiter.check(request, "portal", max_attempts=20, window_seconds=60)
    invoice = complete_stub_pay(db, pay_token)
    return {"status": "paid", "invoice_number": invoice.invoice_number}
