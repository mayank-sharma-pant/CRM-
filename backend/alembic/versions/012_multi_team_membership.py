"""restore missing multi-team membership placeholder revision

Revision ID: 012_multi_team_membership
Revises: 293e8e055922
Create Date: 2026-03-27 00:00:00.000000
"""
from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "012_multi_team_membership"
down_revision: Union[str, None] = "293e8e055922"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # This revision was missing in repo history; kept as no-op for chain integrity.
    pass


def downgrade() -> None:
    pass
