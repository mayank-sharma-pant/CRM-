import pytest
from fastapi import HTTPException

from app.services.marketplace.service import (
    install_app,
    list_apps,
    list_installs,
    uninstall_app,
)
from tests.helpers.factories import create_company


def test_list_apps_starts_not_installed(db):
    company = create_company(db, name="Co", company_code="MP1")
    apps = list_apps(db, company.id)
    assert len(apps) == 9
    assert all(a["status"] == "not_installed" for a in apps)


def test_install_and_uninstall(db):
    company = create_company(db, name="Co", company_code="MP2")
    row = install_app(db, company.id, "scoring", installed_by_id=None)
    assert row.status == "installed"
    assert row.app_slug == "scoring"
    apps = {a["slug"]: a for a in list_apps(db, company.id)}
    assert apps["scoring"]["status"] == "installed"
    assert apps["accounting"]["status"] == "not_installed"

    again = install_app(db, company.id, "scoring", installed_by_id=None)
    assert again.id == row.id
    assert again.status == "installed"

    gone = uninstall_app(db, company.id, "scoring")
    assert gone.status == "uninstalled"
    apps = {a["slug"]: a for a in list_apps(db, company.id)}
    assert apps["scoring"]["status"] == "uninstalled"
    history = list_installs(db, company.id)
    assert len(history) == 1
    assert history[0].status == "uninstalled"


def test_unknown_slug_rejected(db):
    company = create_company(db, name="Co", company_code="MP3")
    with pytest.raises(HTTPException) as ei:
        install_app(db, company.id, "deluge", installed_by_id=None)
    assert ei.value.status_code == 400


def test_uninstall_missing_is_404(db):
    company = create_company(db, name="Co", company_code="MP4")
    with pytest.raises(HTTPException) as ei:
        uninstall_app(db, company.id, "scoring")
    assert ei.value.status_code == 404
