"""Initial schema from SQLAlchemy models

Revision ID: 001_initial
Revises:
Create Date: 2025-02-20

Creates all tables in correct order for foreign keys:
teams -> users -> company_settings -> leads -> clients -> follow_ups ->
tasks -> notes -> invoices -> invoice_items -> ledger_entries -> audit_logs -> invites
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. teams (no FKs)
    op.create_table(
        "teams",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_teams_id"), "teams", ["id"], unique=False)
    op.create_index(op.f("ix_teams_name"), "teams", ["name"], unique=True)

    # 2. users (team_id, manager_id self-ref)
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=50), nullable=False, server_default="sales"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("team_id", sa.Integer(), nullable=True),
        sa.Column("manager_id", sa.Integer(), nullable=True),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True, server_default="1"),
        sa.Column("last_active_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["manager_id"], ["users.id"], ),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"], ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)

    # 3. company_settings (no FKs)
    op.create_table(
        "company_settings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("company_name", sa.String(length=255), nullable=False, server_default="Company Name"),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("gst_number", sa.String(length=50), nullable=True),
        sa.Column("logo_url", sa.String(length=500), nullable=True),
        sa.Column("invoice_prefix", sa.String(length=20), nullable=True, server_default="INV"),
        sa.Column("tax_rate", sa.Float(), nullable=True, server_default="18.0"),
        sa.Column("payment_terms", sa.String(length=50), nullable=True, server_default="Net 30 days"),
        sa.Column("lead_stages", sa.Text(), nullable=True, server_default='["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"]'),
        sa.Column("lost_reasons", sa.Text(), nullable=True, server_default='["No budget", "Timing not right", "Competitor", "No response"]'),
        sa.Column("task_reminders_enabled", sa.Integer(), nullable=True, server_default="1"),
        sa.Column("followup_alerts_enabled", sa.Integer(), nullable=True, server_default="1"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_company_settings_id"), "company_settings", ["id"], unique=False)

    # 4. leads
    op.create_table(
        "leads",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("company", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=True, server_default="New"),
        sa.Column("source", sa.String(length=100), nullable=True),
        sa.Column("service_type", sa.String(length=100), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("assigned_to_id", sa.Integer(), nullable=True),
        sa.Column("team_id", sa.Integer(), nullable=True),
        sa.Column("last_contacted_at", sa.DateTime(), nullable=True),
        sa.Column("last_response_at", sa.DateTime(), nullable=True),
        sa.Column("next_follow_up", sa.DateTime(), nullable=True),
        sa.Column("converted_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
        sa.ForeignKeyConstraint(["assigned_to_id"], ["users.id"], ),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"], ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_leads_id"), "leads", ["id"], unique=False)

    # 5. clients
    op.create_table(
        "clients",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("company", sa.String(length=255), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("assigned_to_id", sa.Integer(), nullable=True),
        sa.Column("team_id", sa.Integer(), nullable=True),
        sa.Column("converted_from_lead_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
        sa.ForeignKeyConstraint(["assigned_to_id"], ["users.id"], ),
        sa.ForeignKeyConstraint(["converted_from_lead_id"], ["leads.id"], ),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"], ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_clients_id"), "clients", ["id"], unique=False)

    # 6. follow_ups
    op.create_table(
        "follow_ups",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("lead_id", sa.Integer(), nullable=False),
        sa.Column("scheduled_date", sa.Date(), nullable=False),
        sa.Column("scheduled_time", sa.Time(), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=True, server_default="Pending"),
        sa.Column("outcome", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("created_by_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ),
        sa.ForeignKeyConstraint(["lead_id"], ["leads.id"], ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_follow_ups_id"), "follow_ups", ["id"], unique=False)

    # 7. tasks
    op.create_table(
        "tasks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=True, server_default="Pending"),
        sa.Column("priority", sa.String(length=20), nullable=True, server_default="medium"),
        sa.Column("due_date", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("lead_id", sa.Integer(), nullable=True),
        sa.Column("client_id", sa.Integer(), nullable=True),
        sa.Column("assigned_to_id", sa.Integer(), nullable=True),
        sa.Column("assigned_by_id", sa.Integer(), nullable=True),
        sa.Column("is_manager_assigned", sa.Boolean(), nullable=True, server_default="0"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
        sa.ForeignKeyConstraint(["assigned_by_id"], ["users.id"], ),
        sa.ForeignKeyConstraint(["assigned_to_id"], ["users.id"], ),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ),
        sa.ForeignKeyConstraint(["lead_id"], ["leads.id"], ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_tasks_id"), "tasks", ["id"], unique=False)

    # 8. notes
    op.create_table(
        "notes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("lead_id", sa.Integer(), nullable=True),
        sa.Column("client_id", sa.Integer(), nullable=True),
        sa.Column("created_by_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ),
        sa.ForeignKeyConstraint(["lead_id"], ["leads.id"], ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_notes_id"), "notes", ["id"], unique=False)

    # 9. invoices
    op.create_table(
        "invoices",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("invoice_number", sa.String(length=50), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("subtotal", sa.Float(), nullable=True, server_default="0.0"),
        sa.Column("tax", sa.Float(), nullable=True, server_default="0.0"),
        sa.Column("discount", sa.Float(), nullable=True, server_default="0.0"),
        sa.Column("total", sa.Float(), nullable=True, server_default="0.0"),
        sa.Column("status", sa.String(length=50), nullable=True, server_default="Draft"),
        sa.Column("issued_date", sa.Date(), nullable=True),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("paid_date", sa.Date(), nullable=True),
        sa.Column("payment_method", sa.String(length=50), nullable=True),
        sa.Column("payment_reference", sa.String(length=100), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_by_id", sa.Integer(), nullable=True),
        sa.Column("approved_by_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
        sa.ForeignKeyConstraint(["approved_by_id"], ["users.id"], ),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_invoices_id"), "invoices", ["id"], unique=False)
    op.create_index(op.f("ix_invoices_invoice_number"), "invoices", ["invoice_number"], unique=True)

    # 10. invoice_items
    op.create_table(
        "invoice_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("invoice_id", sa.Integer(), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=True, server_default="1"),
        sa.Column("unit_price", sa.Float(), nullable=True, server_default="0.0"),
        sa.Column("total", sa.Float(), nullable=True, server_default="0.0"),
        sa.ForeignKeyConstraint(["invoice_id"], ["invoices.id"], ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_invoice_items_id"), "invoice_items", ["id"], unique=False)

    # 11. ledger_entries
    op.create_table(
        "ledger_entries",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("ledger_slug", sa.String(), nullable=False),
        sa.Column("data", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_ledger_entries_id"), "ledger_entries", ["id"], unique=False)
    op.create_index(op.f("ix_ledger_entries_ledger_slug"), "ledger_entries", ["ledger_slug"], unique=False)

    # 12. audit_logs
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
        sa.Column("admin_id", sa.Integer(), nullable=True),
        sa.Column("admin_name", sa.String(length=255), nullable=False, server_default="System"),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("entity_type", sa.String(length=50), nullable=False),
        sa.Column("entity_id", sa.String(length=50), nullable=True),
        sa.Column("entity_name", sa.String(length=255), nullable=True),
        sa.Column("before_value", sa.Text(), nullable=True),
        sa.Column("after_value", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["admin_id"], ["users.id"], ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_audit_logs_id"), "audit_logs", ["id"], unique=False)
    op.create_index(op.f("ix_audit_logs_action"), "audit_logs", ["action"], unique=False)
    op.create_index(op.f("ix_audit_logs_timestamp"), "audit_logs", ["timestamp"], unique=False)

    # 13. invites
    op.create_table(
        "invites",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("role", sa.String(length=50), nullable=False),
        sa.Column("team_id", sa.Integer(), nullable=True),
        sa.Column("manager_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=True, server_default="pending"),
        sa.Column("token", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
        sa.Column("created_by_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ),
        sa.ForeignKeyConstraint(["manager_id"], ["users.id"], ),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"], ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_invites_id"), "invites", ["id"], unique=False)
    op.create_index(op.f("ix_invites_email"), "invites", ["email"], unique=False)
    op.create_index(op.f("ix_invites_status"), "invites", ["status"], unique=False)
    op.create_index(op.f("ix_invites_token"), "invites", ["token"], unique=True)


def downgrade() -> None:
    # Drop in reverse order of creation (respect FKs)
    op.drop_index(op.f("ix_invites_token"), table_name="invites")
    op.drop_index(op.f("ix_invites_status"), table_name="invites")
    op.drop_index(op.f("ix_invites_email"), table_name="invites")
    op.drop_index(op.f("ix_invites_id"), table_name="invites")
    op.drop_table("invites")

    op.drop_index(op.f("ix_audit_logs_timestamp"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_action"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_id"), table_name="audit_logs")
    op.drop_table("audit_logs")

    op.drop_index(op.f("ix_ledger_entries_ledger_slug"), table_name="ledger_entries")
    op.drop_index(op.f("ix_ledger_entries_id"), table_name="ledger_entries")
    op.drop_table("ledger_entries")

    op.drop_index(op.f("ix_invoice_items_id"), table_name="invoice_items")
    op.drop_table("invoice_items")

    op.drop_index(op.f("ix_invoices_invoice_number"), table_name="invoices")
    op.drop_index(op.f("ix_invoices_id"), table_name="invoices")
    op.drop_table("invoices")

    op.drop_index(op.f("ix_notes_id"), table_name="notes")
    op.drop_table("notes")

    op.drop_index(op.f("ix_tasks_id"), table_name="tasks")
    op.drop_table("tasks")

    op.drop_index(op.f("ix_follow_ups_id"), table_name="follow_ups")
    op.drop_table("follow_ups")

    op.drop_index(op.f("ix_clients_id"), table_name="clients")
    op.drop_table("clients")

    op.drop_index(op.f("ix_leads_id"), table_name="leads")
    op.drop_table("leads")

    op.drop_index(op.f("ix_company_settings_id"), table_name="company_settings")
    op.drop_table("company_settings")

    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")

    op.drop_index(op.f("ix_teams_name"), table_name="teams")
    op.drop_index(op.f("ix_teams_id"), table_name="teams")
    op.drop_table("teams")
