"""Stdlib PDF 1.4 writer for GST tax invoices (no extra pip deps)."""
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.core.company_settings import CompanySettings
from app.models.finance.invoice import Invoice, InvoiceItem


def _money(value) -> str:
    return f"INR {Decimal(str(value or 0)).quantize(Decimal('0.01'))}"


def _escape(text: str) -> str:
    raw = (text or "").encode("latin-1", "replace").decode("latin-1")
    return raw.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _simple_pdf(lines: list[str]) -> bytes:
    ops = ["BT", "/F1 11 Tf", "50 760 Td"]
    for i, line in enumerate(lines):
        if i:
            ops.append("0 -14 Td")
        ops.append(f"({_escape(line)}) Tj")
    ops.append("ET")
    stream = "\n".join(ops).encode("latin-1", "replace")

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        (
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            b"/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>"
        ),
        b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]

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


def build_invoice_pdf(db: Session, invoice: Invoice) -> bytes:
    settings = db.query(CompanySettings).filter(CompanySettings.company_id == invoice.company_id).first()
    seller_name = (settings.company_name if settings else None) or "Seller"
    items = db.query(InvoiceItem).filter(InvoiceItem.invoice_id == invoice.id).all()
    lines = [
        "TAX INVOICE",
        seller_name,
        f"Invoice {invoice.invoice_number}",
        f"Seller GSTIN: {invoice.seller_gstin or '-'}",
        f"Buyer GSTIN: {invoice.buyer_gstin or '-'}",
        f"Place of supply: {invoice.place_of_supply or '-'}",
        f"Tax mode: {invoice.tax_mode or '-'}",
        "",
        "Items (HSN)",
    ]
    for item in items[:28]:
        hsn = item.hsn or "-"
        lines.append(
            f"{item.description} HSN {hsn} x{item.quantity} {_money(item.total)}"
        )
    lines.extend([
        "",
        f"Subtotal {_money(invoice.subtotal)}",
        f"CGST {_money(invoice.cgst)}",
        f"SGST {_money(invoice.sgst)}",
        f"IGST {_money(invoice.igst)}",
        f"Tax {_money(invoice.tax)}",
        f"Total {_money(invoice.total)}",
    ])
    if invoice.irn:
        lines.extend(["", f"IRN {invoice.irn}"])
        if invoice.ack_no:
            lines.append(f"Ack No {invoice.ack_no}")
    return _simple_pdf(lines)
