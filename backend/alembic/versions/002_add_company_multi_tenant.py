"""Add company-level multi-tenant isolation

Revision ID: 002_company
Revises: 001_initial
Create Date: 2025-02-21

Adds companies table and company_id to all business entities.
Backfills existing data to a default company.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "002_company"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEFAULT_COMPANY_ID = 1


def upgrade() -> None:
    # 1. Create companies table
    op.create_table(
        "companies",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="active"),
        sa.Column("plan", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_companies_id"), "companies", ["id"], unique=False)
    op.create_index(op.f("ix_companies_status"), "companies", ["status"], unique=False)

    # 2. Insert default company for backfill
    op.execute(
        sa.text(
            "INSERT INTO companies (id, name, status, plan) VALUES (1, 'Default Company', 'active', 'pro')"
        )
    )

    # 3. Add company_id to users (nullable for Platform Admin)
    op.add_column("users", sa.Column("company_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_users_company", "users", "companies", ["company_id"], ["id"])
    op.create_index(op.f("ix_users_company_id"), "users", ["company_id"], unique=False)
    op.execute(sa.text("UPDATE users SET company_id = 1 WHERE company_id IS NULL"))
    # Keep nullable for Platform Admin (role=admin may have company_id=NULL)

    # 4. Add company_id to teams
    op.add_column("teams", sa.Column("company_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_teams_company", "teams", "companies", ["company_id"], ["id"])
    op.create_index(op.f("ix_teams_company_id"), "teams", ["company_id"], unique=False)
    op.execute(sa.text("UPDATE teams SET company_id = 1 WHERE company_id IS NULL"))
    op.alter_column("teams", "company_id", nullable=False)
    # Allow same team name across companies: drop old unique, add composite
    op.drop_index("ix_teams_name", table_name="teams")
    op.create_index("ix_teams_company_name", "teams", ["company_id", "name"], unique=True)

    # 5. Add company_id to leads
    op.add_column("leads", sa.Column("company_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_leads_company", "leads", "companies", ["company_id"], ["id"])
    op.create_index(op.f("ix_leads_company_id"), "leads", ["company_id"], unique=False)
    op.execute(sa.text("UPDATE leads SET company_id = 1 WHERE company_id IS NULL"))
    op.alter_column("leads", "company_id", nullable=False)

    # 6. Add company_id to clients
    op.add_column("clients", sa.Column("company_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_clients_company", "clients", "companies", ["company_id"], ["id"])
    op.create_index(op.f("ix_clients_company_id"), "clients", ["company_id"], unique=False)
    op.execute(sa.text("UPDATE clients SET company_id = 1 WHERE company_id IS NULL"))
    op.alter_column("clients", "company_id", nullable=False)

    # 7. Add company_id to follow_ups
    op.add_column("follow_ups", sa.Column("company_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_follow_ups_company", "follow_ups", "companies", ["company_id"], ["id"])
    op.create_index(op.f("ix_follow_ups_company_id"), "follow_ups", ["company_id"], unique=False)
    op.execute(sa.text("UPDATE follow_ups SET company_id = 1 WHERE company_id IS NULL"))
    op.alter_column("follow_ups", "company_id", nullable=False)

    # 8. Add company_id to tasks
    op.add_column("tasks", sa.Column("company_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_tasks_company", "tasks", "companies", ["company_id"], ["id"])
    op.create_index(op.f("ix_tasks_company_id"), "tasks", ["company_id"], unique=False)
    op.execute(sa.text("UPDATE tasks SET company_id = 1 WHERE company_id IS NULL"))
    op.alter_column("tasks", "company_id", nullable=False)

    # 9. Add company_id to ledger_entries
    op.add_column("ledger_entries", sa.Column("company_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_ledger_entries_company", "ledger_entries", "companies", ["company_id"], ["id"])
    op.create_index(op.f("ix_ledger_entries_company_id"), "ledger_entries", ["company_id"], unique=False)
    op.execute(sa.text("UPDATE ledger_entries SET company_id = 1 WHERE company_id IS NULL"))
    op.alter_column("ledger_entries", "company_id", nullable=False)

    # 10. Add company_id to invoices
    op.add_column("invoices", sa.Column("company_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_invoices_company", "invoices", "companies", ["company_id"], ["id"])
    op.create_index(op.f("ix_invoices_company_id"), "invoices", ["company_id"], unique=False)
    op.execute(sa.text("UPDATE invoices SET company_id = 1 WHERE company_id IS NULL"))
    op.alter_column("invoices", "company_id", nullable=False)

    # 11. Add company_id to invites
    op.add_column("invites", sa.Column("company_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_invites_company", "invites", "companies", ["company_id"], ["id"])
    op.create_index(op.f("ix_invites_company_id"), "invites", ["company_id"], unique=False)
    op.execute(sa.text("UPDATE invites SET company_id = 1 WHERE company_id IS NULL"))
    op.alter_column("invites", "company_id", nullable=False)

    # 12. Add company_id to company_settings
    op.add_column("company_settings", sa.Column("company_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_company_settings_company", "company_settings", "companies", ["company_id"], ["id"])
    op.create_index(op.f("ix_company_settings_company_id"), "company_settings", ["company_id"], unique=False)
    op.execute(sa.text("UPDATE company_settings SET company_id = 1 WHERE company_id IS NULL"))
    op.alter_column("company_settings", "company_id", nullable=False)

    # 13. Add company_id to audit_logs (for audit trail per company)
    op.add_column("audit_logs", sa.Column("company_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_audit_logs_company", "audit_logs", "companies", ["company_id"], ["id"])
    op.create_index(op.f("ix_audit_logs_company_id"), "audit_logs", ["company_id"], unique=False)
    op.execute(sa.text("UPDATE audit_logs SET company_id = 1 WHERE company_id IS NULL"))


def downgrade() -> None:
    # Remove company_id from all tables (reverse order)
    op.drop_index(op.f("ix_audit_logs_company_id"), table_name="audit_logs")
    op.drop_constraint("fk_audit_logs_company", "audit_logs", type_="foreignkey")
    op.drop_column("audit_logs", "company_id")

    op.drop_index(op.f("ix_company_settings_company_id"), table_name="company_settings")
    op.drop_constraint("fk_company_settings_company", "company_settings", type_="foreignkey")
    op.drop_column("company_settings", "company_id")

    op.drop_index(op.f("ix_invites_company_id"), table_name="invites")
    op.drop_constraint("fk_invites_company", "invites", type_="foreignkey")
    op.drop_column("invites", "company_id")

    op.drop_index(op.f("ix_invoices_company_id"), table_name="invoices")
    op.drop_constraint("fk_invoices_company", "invoices", type_="foreignkey")
    op.drop_column("invoices", "company_id")

    op.drop_index(op.f("ix_ledger_entries_company_id"), table_name="ledger_entries")
    op.drop_constraint("fk_ledger_entries_company", "ledger_entries", type_="foreignkey")
    op.drop_column("ledger_entries", "company_id")

    op.drop_index(op.f("ix_tasks_company_id"), table_name="tasks")
    op.drop_constraint("fk_tasks_company", "tasks", type_="foreignkey")
    op.drop_column("tasks", "company_id")

    op.drop_index(op.f("ix_follow_ups_company_id"), table_name="follow_ups")
    op.drop_constraint("fk_follow_ups_company", "follow_ups", type_="foreignkey")
    op.drop_column("follow_ups", "company_id")

    op.drop_index(op.f("ix_clients_company_id"), table_name="clients")
    op.drop_constraint("fk_clients_company", "clients", type_="foreignkey")
    op.drop_column("clients", "company_id")

    op.drop_index(op.f("ix_leads_company_id"), table_name="leads")
    op.drop_constraint("fk_leads_company", "leads", type_="foreignkey")
    op.drop_column("leads", "company_id")

    op.drop_index("ix_teams_company_name", table_name="teams")
    op.create_index("ix_teams_name", "teams", ["name"], unique=True)
    op.drop_index(op.f("ix_teams_company_id"), table_name="teams")
    op.drop_constraint("fk_teams_company", "teams", type_="foreignkey")
    op.drop_column("teams", "company_id")

    op.drop_index(op.f("ix_users_company_id"), table_name="users")
    op.drop_constraint("fk_users_company", "users", type_="foreignkey")
    op.drop_column("users", "company_id")

    op.drop_index(op.f("ix_companies_status"), table_name="companies")
    op.drop_index(op.f("ix_companies_id"), table_name="companies")
    op.drop_table("companies")
