"""update_team_transfer_requests_for_multi_team

Revision ID: 35f50af5bf55
Revises: 012_multi_team_membership
Create Date: 2026-03-26 15:42:02.722792

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '35f50af5bf55'
down_revision: Union[str, None] = '012_multi_team_membership'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
