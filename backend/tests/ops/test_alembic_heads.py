from pathlib import Path

from alembic.config import Config
from alembic.script import ScriptDirectory


def _scripts() -> ScriptDirectory:
    backend = Path(__file__).resolve().parents[2]
    cfg = Config(str(backend / "alembic.ini"))
    cfg.set_main_option("script_location", str(backend / "alembic"))
    return ScriptDirectory.from_config(cfg)


def test_alembic_has_exactly_one_head():
    heads = _scripts().get_heads()
    assert len(heads) == 1, heads
    assert heads == ["017_enrichment"]


def test_catchup_revision_follows_015():
    rev = _scripts().get_revision("016_schema_catchup")
    assert rev is not None
    assert rev.down_revision == "015_ai_reasoning"


def test_enrichment_revision_follows_016():
    rev = _scripts().get_revision("017_enrichment")
    assert rev is not None
    assert rev.down_revision == "016_schema_catchup"
