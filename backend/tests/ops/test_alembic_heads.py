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
    assert heads == ["026_mass_email"]


def test_catchup_revision_follows_015():
    rev = _scripts().get_revision("016_schema_catchup")
    assert rev is not None
    assert rev.down_revision == "015_ai_reasoning"


def test_enrichment_revision_follows_016():
    rev = _scripts().get_revision("017_enrichment")
    assert rev is not None
    assert rev.down_revision == "016_schema_catchup"


def test_token_version_revision_follows_017():
    rev = _scripts().get_revision("018_token_version")
    assert rev is not None
    assert rev.down_revision == "017_enrichment"


def test_scoring_revision_follows_018():
    rev = _scripts().get_revision("019_scoring")
    assert rev is not None
    assert rev.down_revision == "018_token_version"


def test_predictions_revision_follows_019():
    rev = _scripts().get_revision("020_predictions")
    assert rev is not None
    assert rev.down_revision == "019_scoring"


def test_accounting_revision_follows_020():
    rev = _scripts().get_revision("021_accounting")
    assert rev is not None
    assert rev.down_revision == "020_predictions"


def test_custom_modules_revision_follows_021():
    rev = _scripts().get_revision("022_custom_modules")
    assert rev is not None
    assert rev.down_revision == "021_accounting"


def test_marketplace_revision_follows_022():
    rev = _scripts().get_revision("023_marketplace")
    assert rev is not None
    assert rev.down_revision == "022_custom_modules"


def test_campaigns_revision_follows_023():
    rev = _scripts().get_revision("024_campaigns")
    assert rev is not None
    assert rev.down_revision == "023_marketplace"


def test_cases_revision_follows_024():
    rev = _scripts().get_revision("025_cases")
    assert rev is not None
    assert rev.down_revision == "024_campaigns"


def test_mass_email_revision_follows_025():
    rev = _scripts().get_revision("026_mass_email")
    assert rev is not None
    assert rev.down_revision == "025_cases"
