"""Copy a capped CRM snapshot from a live company into its sandbox."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.finance.invoice import Invoice, InvoiceItem
from app.models.sales.account import Account
from app.models.sales.client import Client
from app.models.sales.custom_field import CustomFieldDef, CustomFieldValue
from app.models.sales.custom_module import CustomModule, CustomModuleField, CustomModuleRecord
from app.models.sales.deal import Deal
from app.models.sales.lead import Lead
from app.models.sales.pipeline import Pipeline, PipelineStage
from app.models.sales.product import Product
from app.models.sales.quote import Quote, QuoteItem
from app.models.sales.scoring import ScoringRule

MAX_CLONE_ROWS = 100
USER_FKS = frozenset({
    "assigned_to_id", "created_by_id", "updated_by_id", "approved_by_id",
})
CLEAR_FKS = frozenset({
    "team_id", "stock_item_id", "share_token_hash", "share_created_at", "payment_url",
})
OPTIONAL_MAP = {
    "pipeline_id": "pipelines",
    "stage_id": "stages",
    "lead_id": "leads",
    "client_id": "clients",
    "account_id": "accounts",
    "deal_id": "deals",
    "invoice_id": "invoices",
    "product_id": "products",
    "converted_from_lead_id": "leads",
    "module_id": "modules",
    "quote_id": "quotes",
    "field_def_id": "field_defs",
}
SKIP_COLS = frozenset({"id"})


def _query(db: Session, model, company_id: int, extra=None):
    q = db.query(model).filter(model.company_id == company_id)
    if extra is not None:
        q = extra(q)
    return q.order_by(model.id.asc()).limit(MAX_CLONE_ROWS).all()


def _column_value(src, name, *, dest_company_id, admin_id, maps, extra):
    if name in extra:
        return extra[name]
    if name == "company_id":
        return dest_company_id
    if name in USER_FKS:
        return admin_id if getattr(src, name) is not None else None
    if name in CLEAR_FKS:
        return None
    if name in OPTIONAL_MAP:
        old = getattr(src, name)
        if old is None:
            return None
        mapped = maps.get(OPTIONAL_MAP[name], {}).get(old)
        return mapped
    return getattr(src, name)


def _clone_row(db: Session, model, src, *, dest_company_id, admin_id, maps, extra=None, required=()):
    extra = extra or {}
    data = {}
    for col in model.__table__.columns:
        name = col.name
        if name in SKIP_COLS:
            continue
        data[name] = _column_value(
            src, name,
            dest_company_id=dest_company_id, admin_id=admin_id, maps=maps, extra=extra,
        )
    for key in required:
        if data.get(key) is None:
            return None
    row = model(**data)
    db.add(row)
    db.flush()
    return row


def _table(db, model, parent_id, dest_id, admin_id, maps, map_key, *, extra_query=None, required=()):
    copied = 0
    id_map = maps.setdefault(map_key, {})
    for src in _query(db, model, parent_id, extra_query):
        row = _clone_row(
            db, model, src,
            dest_company_id=dest_id, admin_id=admin_id, maps=maps, required=required,
        )
        if row is None:
            continue
        id_map[src.id] = row.id
        copied += 1
    return copied


def clone_parent_data(db: Session, *, parent_id: int, sandbox_id: int, admin_id: int) -> dict:
    maps: dict[str, dict[int, int]] = {}
    counts = {
        "pipelines": 0, "stages": 0, "products": 0, "custom_fields": 0,
        "accounts": 0, "clients": 0, "leads": 0, "deals": 0,
        "invoices": 0, "quotes": 0, "scoring_rules": 0, "custom_modules": 0,
    }

    counts["pipelines"] = _table(db, Pipeline, parent_id, sandbox_id, admin_id, maps, "pipelines")
    counts["stages"] = _table(
        db, PipelineStage, parent_id, sandbox_id, admin_id, maps, "stages",
        required=("pipeline_id",),
    )
    counts["products"] = _table(db, Product, parent_id, sandbox_id, admin_id, maps, "products")
    counts["custom_fields"] = _table(
        db, CustomFieldDef, parent_id, sandbox_id, admin_id, maps, "field_defs",
    )
    counts["accounts"] = _table(db, Account, parent_id, sandbox_id, admin_id, maps, "accounts")
    counts["clients"] = _table(db, Client, parent_id, sandbox_id, admin_id, maps, "clients")
    counts["leads"] = _table(
        db, Lead, parent_id, sandbox_id, admin_id, maps, "leads",
        extra_query=lambda q: q.filter(Lead.deleted_at.is_(None)),
    )
    counts["deals"] = _table(
        db, Deal, parent_id, sandbox_id, admin_id, maps, "deals",
        required=("pipeline_id", "stage_id"),
    )
    counts["invoices"] = _table(
        db, Invoice, parent_id, sandbox_id, admin_id, maps, "invoices",
        required=("client_id",),
    )
    _table(
        db, InvoiceItem, parent_id, sandbox_id, admin_id, maps, "invoice_items",
        required=("invoice_id",),
    )
    counts["quotes"] = _table(
        db, Quote, parent_id, sandbox_id, admin_id, maps, "quotes",
        required=("client_id",),
    )
    _table(
        db, QuoteItem, parent_id, sandbox_id, admin_id, maps, "quote_items",
        required=("quote_id",),
    )

    value_count = 0
    for src in _query(db, CustomFieldValue, parent_id):
        new_def = maps.get("field_defs", {}).get(src.field_def_id)
        if new_def is None:
            continue
        definition = db.query(CustomFieldDef).filter(CustomFieldDef.id == new_def).first()
        entity_map_key = {
            "lead": "leads", "leads": "leads",
            "deal": "deals", "deals": "deals",
            "client": "clients", "clients": "clients",
            "account": "accounts", "accounts": "accounts",
        }.get((definition.entity_type if definition else "") or "", "")
        new_entity = maps.get(entity_map_key, {}).get(src.entity_id) if entity_map_key else None
        if new_entity is None:
            continue
        row = _clone_row(
            db, CustomFieldValue, src,
            dest_company_id=sandbox_id, admin_id=admin_id, maps=maps,
            extra={"field_def_id": new_def, "entity_id": new_entity},
            required=("field_def_id",),
        )
        if row:
            value_count += 1
    counts["custom_fields"] += value_count

    counts["scoring_rules"] = _table(
        db, ScoringRule, parent_id, sandbox_id, admin_id, maps, "scoring_rules",
    )
    counts["custom_modules"] = _table(
        db, CustomModule, parent_id, sandbox_id, admin_id, maps, "modules",
    )
    _table(
        db, CustomModuleField, parent_id, sandbox_id, admin_id, maps, "module_fields",
        required=("module_id",),
    )
    _table(
        db, CustomModuleRecord, parent_id, sandbox_id, admin_id, maps, "module_records",
        required=("module_id",),
    )
    db.commit()
    return counts
