"""add employee_num to users

Revision ID: 011_add_employee_num
Revises: 010_add_notifications
Create Date: 2026-03-24 12:20:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '011_add_employee_num'
down_revision = '473b7b45e768'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add the column (nullable so existing rows don't break)
    op.add_column('users', sa.Column('employee_num', sa.Integer(), nullable=True))

    # 2. Backfill existing users: assign sequential employee_num per company
    #    ordered by user id (preserving the original implicit rank).
    conn = op.get_bind()

    # Get all distinct company_ids that have users
    companies = conn.execute(
        text("SELECT DISTINCT company_id FROM users WHERE company_id IS NOT NULL ORDER BY company_id")
    ).fetchall()

    for (company_id,) in companies:
        # Fetch users in this company ordered by id
        users = conn.execute(
            text("SELECT id FROM users WHERE company_id = :cid ORDER BY id"),
            {"cid": company_id},
        ).fetchall()

        for idx, (user_id,) in enumerate(users, start=1):
            conn.execute(
                text("UPDATE users SET employee_num = :num WHERE id = :uid"),
                {"num": idx, "uid": user_id},
            )


def downgrade() -> None:
    op.drop_column('users', 'employee_num')
