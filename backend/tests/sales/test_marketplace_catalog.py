from app.services.marketplace.catalog import CATALOG, get_app


def test_catalog_has_locked_slugs():
    assert set(CATALOG) == {
        "scoring", "predictions", "accounting", "custom_modules",
        "email", "calendar", "whatsapp", "telephony", "webhooks",
    }


def test_each_app_has_name_summary_href():
    for slug, app in CATALOG.items():
        assert app["slug"] == slug
        assert app["name"]
        assert app["summary"]
        assert app["settings_href"].startswith("/")


def test_unknown_slug_is_none():
    assert get_app("zoho-books") is None
