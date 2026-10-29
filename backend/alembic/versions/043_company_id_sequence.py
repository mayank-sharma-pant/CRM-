"""Move the companies id counter past the existing rows.

002 inserted the backfill company with a fixed id (1) without advancing the
PostgreSQL sequence, so on a database built from migrations the next company
was also given id 1 and failed with a duplicate key. This sets the counter so
the next id is above every existing company id. It never moves the counter
backwards: where the counter is already ahead (any database that has created
companies) it changes nothing.

Downgrade does nothing: moving the counter back could hand out an id again.

Revision ID: 043_company_id_sequence
Revises: 042_chat_calls
Create Date: 2026-10-29
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "043_company_id_sequence"
down_revision: Union[str, None] = "042_chat_calls"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    sequence = bind.execute(sa.text("SELECT pg_get_serial_sequence('companies', 'id')")).scalar()
    if sequence is None:
        return
    # Nobody may add a company between reading the counter and setting it (released at this migration's commit).
    bind.execute(sa.text("LOCK TABLE companies IN EXCLUSIVE MODE"))
    # The name comes from the catalog, already quoted by pg_get_serial_sequence.
    last_value, is_called = bind.execute(sa.text(f"SELECT last_value, is_called FROM {sequence}")).one()
    next_id = last_value + 1 if is_called else last_value
    max_id = bind.execute(sa.text("SELECT COALESCE(MAX(id), 0) FROM companies")).scalar()
    if max_id >= next_id:
        bind.execute(
            sa.text("SELECT setval(CAST(:sequence AS regclass), :value, false)"),
            {"sequence": sequence, "value": max_id + 1},
        )


def downgrade() -> None:
    pass
