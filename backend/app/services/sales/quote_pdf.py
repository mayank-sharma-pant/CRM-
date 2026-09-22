"""Stdlib multi-page PDF for sales quotations (no extra pip deps)."""
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

from sqlalchemy.orm import Session

from app.models.core.company_settings import CompanySettings
from app.models.sales.client import Client
from app.models.sales.quote import Quote, QuoteItem


def _money(value) -> str:
    return f"INR {Decimal(str(value or 0)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)}"


def _escape(text: str) -> str:
    raw = (text or "").encode("latin-1", "replace").decode("latin-1")
    return raw.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _wrap(text: str, width: int = 92) -> list[str]:
    words = (text or "").replace("\r", "").split()
    if not words:
        return [""]
    lines: list[str] = []
    current = words[0]
    for word in words[1:]:
        candidate = f"{current} {word}"
        if len(candidate) <= width:
            current = candidate
        else:
            lines.append(current)
            current = word
    lines.append(current)
    return lines


def _multi_page_pdf(lines: list[str], *, lines_per_page: int = 48) -> bytes:
    pages = [lines[i : i + lines_per_page] for i in range(0, max(len(lines), 1), lines_per_page)]
    if not pages:
        pages = [[""]]

    content_objs: list[bytes] = []
    for page_lines in pages:
        ops = ["BT", "/F1 10 Tf", "40 760 Td"]
        for i, line in enumerate(page_lines):
            if i:
                ops.append("0 -14 Td")
            ops.append(f"({_escape(line)}) Tj")
        ops.append("ET")
        stream = "\n".join(ops).encode("latin-1", "replace")
        content_objs.append(b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream")

    objects: list[bytes] = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
    ]
    kids = " ".join(f"{i} 0 R" for i in range(3, 3 + len(pages)))
    objects.append(f"<< /Type /Pages /Kids [{kids}] /Count {len(pages)} >>".encode("ascii"))

    font_obj_num = 3 + len(pages) + len(pages)
    for idx, _ in enumerate(pages):
        content_num = 3 + len(pages) + idx
        objects.append(
            (
                f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
                f"/Contents {content_num} 0 R /Resources << /Font << /F1 {font_obj_num} 0 R >> >> >>"
            ).encode("ascii")
        )
    objects.extend(content_objs)
    objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")

    chunks = [b"%PDF-1.4\n"]
    offsets = []
    pos = len(chunks[0])
    for i, obj in enumerate(objects, start=1):
        offsets.append(pos)
        piece = f"{i} 0 obj\n".encode("ascii") + obj + b"\nendobj\n"
        chunks.append(piece)
        pos += len(piece)
    xref_pos = pos
    xref = [b"xref\n", f"0 {len(objects) + 1}\n".encode("ascii"), b"0000000000 65535 f \n"]
    for off in offsets:
        xref.append(f"{off:010d} 00000 n \n".encode("ascii"))
    trailer = (
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
        f"startxref\n{xref_pos}\n%%EOF\n"
    ).encode("ascii")
    return b"".join(chunks + xref + [trailer])


def _interval_label(value: Optional[str]) -> str:
    if (value or "").lower() == "one_time":
        return "One Time"
    return "Monthly"


def build_quote_pdf(db: Session, quote: Quote) -> bytes:
    settings = db.query(CompanySettings).filter(CompanySettings.company_id == quote.company_id).first()
    client = db.query(Client).filter(Client.id == quote.client_id).first()
    items = db.query(QuoteItem).filter(QuoteItem.quote_id == quote.id).all()

    seller = (settings.company_name if settings else None) or "Seller"
    client_name = (client.name if client else None) or "Client"
    plan = quote.plan_name or quote.title or "Quotation"
    project = quote.project or plan
    currency = quote.currency or "INR"
    validity = quote.validity_days if quote.validity_days is not None else (
        getattr(settings, "quote_validity_days", None) if settings else None
    ) or 5
    interval = _interval_label(quote.billing_interval)
    inclusive = bool(quote.fee_inclusive if quote.fee_inclusive is not None else 1)
    created = quote.created_at.strftime("%d %B %Y") if quote.created_at else ""

    lines: list[str] = [
        seller.upper(),
        "",
        "QUOTATION",
        plan,
        f"Prepared by {seller}",
        "",
        f"Quotation Date          {created}",
        f"Client                  {client_name}",
        f"Prepared By             {seller}",
        f"Project                 {project}",
    ]
    if quote.website:
        lines.append(f"Website                 {quote.website}")
    lines.extend([
        f"Plan                    {plan} — {interval}",
        f"Quotation Validity      {validity} days",
        f"Currency                {currency}",
        f"GST                     {getattr(settings, 'tax_rate', 18) or 18}% applicable",
        "",
        "1. Executive Commercial Proposal",
    ])
    summary = (quote.executive_summary or "").strip()
    if summary:
        for part in summary.split("\n"):
            lines.extend(_wrap(part))
    else:
        lines.extend(_wrap(
            f"{seller} proposes a {interval.lower()} engagement for {client_name} "
            f"under the {plan} commercial terms stated in this quotation."
        ))

    lines.extend(["", "2. Investment Summary"])
    for item in items:
        period = " / month" if (quote.billing_interval or "").lower() == "monthly" else ""
        fee = item.unit_price
        tax = item.tax
        total = Decimal(str(item.total or 0)) + Decimal(str(tax or 0))
        if inclusive:
            lines.append(f"{item.description} — {_money(total)}{period} (incl. GST)")
            lines.append(f"  Professional fee {_money(fee)}{period} + GST {_money(tax)}{period}")
        else:
            lines.append(f"{item.description} — {_money(fee)}{period} + GST {_money(tax)}{period} = {_money(total)}{period}")

    lines.extend([
        "",
        f"Subtotal {_money(quote.subtotal)}",
        f"CGST {_money(quote.cgst)}  SGST {_money(quote.sgst)}  IGST {_money(quote.igst)}",
        f"Tax {_money(quote.tax)}",
        f"Total Payable {_money(quote.total)}" + (" / month" if (quote.billing_interval or "").lower() == "monthly" else ""),
        "",
        "3. Included Scope",
    ])
    scope = (quote.scope_text or "").strip()
    if scope:
        for raw in scope.split("\n"):
            bullet = raw.strip()
            if not bullet:
                continue
            if not bullet.startswith("•") and not bullet.startswith("-"):
                bullet = f"• {bullet}"
            lines.extend(_wrap(bullet))
    else:
        lines.append("• Scope as agreed during discovery / kickoff.")

    if quote.notes:
        lines.extend(["", "Notes"])
        for part in quote.notes.split("\n"):
            lines.extend(_wrap(part))

    lines.extend([
        "",
        "4. Acceptance",
        "Approval of this quotation by signed acceptance, written confirmation/email",
        "or purchase order constitutes acceptance of the commercial terms herein.",
        "",
        f"For {seller.upper()}".ljust(40) + f"For {client_name.upper()}",
        "Authorized Name: ____________________    Authorized Name: ____________________",
        "Designation: ________________________    Designation: ________________________",
        "Signature: __________________________    Signature: __________________________",
        "Date: ____________                       Date: ____________",
        "",
        "5. Company & Payment Details",
        f"Company               {seller}",
    ])
    if settings:
        if settings.address:
            for part in _wrap(f"Address               {settings.address}"):
                lines.append(part)
        if settings.gst_number:
            lines.append(f"GSTIN/UIN             {settings.gst_number}")
        if settings.state:
            lines.append(f"State                 {settings.state}")
        if settings.state_code:
            lines.append(f"State Code            {settings.state_code}")
        if settings.cin:
            lines.append(f"CIN                   {settings.cin}")
        if settings.contact_phone:
            lines.append(f"Contact               {settings.contact_phone}")
        if settings.contact_email:
            lines.append(f"Email                 {settings.contact_email}")
        if settings.pan:
            lines.append(f"PAN                   {settings.pan}")
        if settings.bank_account_name:
            lines.append(f"A/c Holder            {settings.bank_account_name}")
        if settings.bank_name:
            lines.append(f"Bank Name             {settings.bank_name}")
        if settings.bank_account_number:
            lines.append(f"A/c No.               {settings.bank_account_number}")
        if settings.bank_ifsc:
            lines.append(f"IFSC                  {settings.bank_ifsc}")

    return _multi_page_pdf(lines)
