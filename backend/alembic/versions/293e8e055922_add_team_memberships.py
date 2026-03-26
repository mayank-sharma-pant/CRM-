"""add team memberships

Revision ID: 293e8e055922
Revises: 011_add_employee_num
Create Date: 2026-03-26 17:33:31.431255

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '293e8e055922'
down_revision: Union[str, None] = '011_add_employee_num'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "team_memberships",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("team_id", sa.Integer(), sa.ForeignKey("teams.id"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.UniqueConstraint("team_id", "user_id", name="ux_team_memberships_team_user"),
    )
    op.create_index("ix_team_memberships_company_team", "team_memberships", ["company_id", "team_id"])
    op.create_index("ix_team_memberships_company_user", "team_memberships", ["company_id", "user_id"])
    op.create_index(op.f("ix_team_memberships_team_id"), "team_memberships", ["team_id"])
    op.create_index(op.f("ix_team_memberships_user_id"), "team_memberships", ["user_id"])

    # Backfill existing 1-team-per-user data into memberships.
    # Only users with both company_id and team_id are included.
    op.execute(
        sa.text(
            """
            INSERT INTO team_memberships (company_id, team_id, user_id)
            SELECT u.company_id, u.team_id, u.id
            FROM users u
            WHERE u.company_id IS NOT NULL AND u.team_id IS NOT NULL
            """
        )
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_team_memberships_user_id"), table_name="team_memberships")
    op.drop_index(op.f("ix_team_memberships_team_id"), table_name="team_memberships")
    op.drop_index("ix_team_memberships_company_user", table_name="team_memberships")
    op.drop_index("ix_team_memberships_company_team", table_name="team_memberships")
    op.drop_table("team_memberships")
