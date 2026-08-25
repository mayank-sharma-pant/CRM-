from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import get_db
from app.routers.auth import auth
from app.routers.auth import mfa as auth_mfa
from app.routers.auth import oauth as auth_oauth
from app.routers.auth import saml as auth_saml
from app.routers.admin import users, admin, platform, notifications, company_security, api_keys as company_api_keys
from app.routers.admin.saml_settings import router as saml_settings_router
from app.routers.privacy import router as privacy_router
from app.routers.sales import leads, tasks, clients, follow_ups, search, timeline
from app.routers.sales.deals import router as deals_router
from app.routers.sales.forecasting import router as forecasting_router
from app.routers.sales.meetings import router as meetings_router
from app.routers.sales.calls import router as calls_router
from app.routers.sales.reports import router as reports_router
from app.routers.sales.dashboards import router as dashboards_router
from app.routers.sales.quotes import router as quotes_router
from app.routers.sales.products import router as products_router
from app.routers.sales.lead_forms import router as lead_forms_router
from app.routers.sales.custom_fields import router as custom_fields_router
from app.routers.sales.emails import router as emails_router
from app.routers.sales.mailbox import router as mailbox_router
from app.routers.sales.calendar import router as calendar_router
from app.routers.sales.telephony import router as telephony_router
from app.routers.sales.whatsapp import router as whatsapp_router
from app.routers.sales.onboarding import router as onboarding_router
from app.routers.sales.tags import router as tags_router
from app.routers.sales.territories import router as territories_router
from app.routers.sales.accounts import router as accounts_router
from app.routers.sales.reminders import router as reminders_router
from app.routers.sales.saved_filters import router as saved_filters_router
from app.routers.sales.outbound_webhooks import router as outbound_webhooks_router
from app.routers.public.lead_forms import router as public_lead_forms_router
from app.routers.public.widget import router as public_widget_router
from app.routers.public.portal import router as portal_router
from app.routers.public.v1 import router as public_v1_router
from app.routers.finance import invoices, purchase, ledgers, export
from app.routers.ops import leaves, documents, bug_report, imports, inventory
from app.routers.management import md, manager
from app.routers.ai.company_assistant import router as company_ai_router
from app.routers import teams
from app.routers.billing import router as billing_router
from app.routers.company.sandbox import router as sandbox_router
from app.config import settings
import traceback
import logging
import logging.config
import os

# -------------------------------------------------------
# Structured logging — JSON-friendly format for production
# -------------------------------------------------------
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.config.dictConfig({
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            "datefmt": "%Y-%m-%dT%H:%M:%S",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "default",
            "stream": "ext://sys.stdout",
        },
    },
    "root": {
        "level": LOG_LEVEL,
        "handlers": ["console"],
    },
})

logger = logging.getLogger("app")

# Disable docs in production
is_production = os.getenv("ENVIRONMENT", "development") == "production"

app = FastAPI(
    title="Perioxia CRM API",
    version="1.0.0",
    description="Perioxia CRM HTTP API",
    docs_url=None if is_production else "/docs",
    redoc_url=None if is_production else "/redoc",
)

from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=os.getenv("TRUSTED_HOSTS", "127.0.0.1").split(","))

from app.middleware.security import SecurityHeadersMiddleware
from app.tenancy import bind_tenant, path_uses_rls_bypass, reset_tenant
app.add_middleware(SecurityHeadersMiddleware)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    from fastapi import HTTPException as FastAPIHTTPException
    if isinstance(exc, FastAPIHTTPException):
        raise exc
    tb = traceback.format_exception(type(exc), exc, exc.__traceback__)
    tb_str = ''.join(tb)
    logger.error(f"Unhandled error on {request.method} {request.url}:\n{tb_str}")
    if is_production:
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})
    return JSONResponse(status_code=500, content={"detail": f"{type(exc).__name__}: {exc}"})

# CORS Configuration (trim whitespace; duplicate .env keys can silently pick the wrong value)
_raw_origins = settings.CORS_ORIGINS.split(",") if settings.CORS_ORIGINS else []
allowed_origins = [o.strip() for o in _raw_origins if o.strip()] or [
    "http://localhost:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],  # For CSV export downloads
)

@app.middleware("http")
async def rls_request_context(request: Request, call_next):
    reset_tenant()
    if path_uses_rls_bypass(request.url.path):
        bind_tenant(bypass=True)
    try:
        return await call_next(request)
    finally:
        reset_tenant()

# Include API routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(auth_mfa.router, prefix="/api/auth")
app.include_router(auth_oauth.router, prefix="/api/auth")
app.include_router(auth_saml.router, prefix="/api/auth")
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(leads.router, prefix="/api/leads", tags=["Leads"])
app.include_router(deals_router, prefix="/api/deals", tags=["Deals"])
app.include_router(forecasting_router, prefix="/api/forecasting", tags=["Forecasting"])
app.include_router(meetings_router, prefix="/api/meetings", tags=["Meetings"])
app.include_router(calls_router, prefix="/api/calls", tags=["Calls"])
app.include_router(reports_router, prefix="/api/reports", tags=["Reports"])
app.include_router(dashboards_router, prefix="/api/dashboards", tags=["Dashboards"])
app.include_router(quotes_router, prefix="/api/quotes", tags=["Quotes"])
app.include_router(products_router, prefix="/api/products", tags=["Products"])
app.include_router(lead_forms_router, prefix="/api/lead-forms", tags=["Lead Forms"])
app.include_router(custom_fields_router, prefix="/api/custom-fields", tags=["Custom Fields"])
app.include_router(emails_router, prefix="/api/emails", tags=["Emails"])
app.include_router(mailbox_router, prefix="/api/mailbox", tags=["Mailbox"])
app.include_router(calendar_router, prefix="/api/calendar", tags=["Calendar"])
app.include_router(telephony_router, prefix="/api/telephony", tags=["Telephony"])
app.include_router(whatsapp_router, prefix="/api/whatsapp", tags=["WhatsApp"])
app.include_router(onboarding_router, prefix="/api/onboarding", tags=["Onboarding"])
app.include_router(tags_router, prefix="/api/tags", tags=["Tags"])
app.include_router(territories_router, prefix="/api/territories", tags=["Territories"])
app.include_router(accounts_router, prefix="/api/accounts", tags=["Accounts"])
app.include_router(saved_filters_router, prefix="/api/saved-filters", tags=["Saved Filters"])
app.include_router(outbound_webhooks_router, prefix="/api/webhooks", tags=["Outbound Webhooks"])
app.include_router(reminders_router, prefix="/api/reminders", tags=["Reminders"])
app.include_router(public_lead_forms_router, prefix="/api/public/forms", tags=["Public Forms"])
app.include_router(public_widget_router, prefix="/api/public/widget", tags=["Website Widget"])
app.include_router(portal_router, prefix="/api/portal", tags=["Portal"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["Tasks"])
app.include_router(clients.router, prefix="/api/clients", tags=["Clients"])
app.include_router(follow_ups.router, prefix="/api/follow-ups", tags=["Follow-ups"])
app.include_router(manager.router, prefix="/api/manager", tags=["Manager"])
app.include_router(md.router, prefix="/api/md", tags=["Managing Director"])
app.include_router(purchase.router, prefix="/api/purchase", tags=["Purchase"])
app.include_router(invoices.router, prefix="/api/invoices", tags=["Invoices"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(company_security.router, prefix="/api")
app.include_router(saml_settings_router, prefix="/api/saml", tags=["SAML Settings"])
app.include_router(privacy_router, prefix="/api/privacy", tags=["Privacy"])
app.include_router(company_api_keys.router, prefix="/api/api-keys", tags=["API Keys"])
app.include_router(public_v1_router, prefix="/api/v1", tags=["Public API"])
app.include_router(ledgers.router) # Prefix is defined in the router itself
app.include_router(leaves.router, prefix="/api/leaves", tags=["Leaves"])
app.include_router(platform.router, prefix="/api/platform", tags=["Platform"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(export.router, prefix="/api/export", tags=["Export"])
app.include_router(search.router, prefix="/api/search", tags=["Search"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(timeline.router, prefix="/api/timeline", tags=["Timeline"])
app.include_router(bug_report.router, prefix="/api/bug-report", tags=["Bug Reports"])
app.include_router(imports.router, prefix="/api/import", tags=["Import"])
app.include_router(inventory.router, prefix="/api/inventory", tags=["Inventory"])
app.include_router(company_ai_router, prefix="/api/ai", tags=["AI"])
app.include_router(teams.router, prefix="/api/teams", tags=["Teams"])
app.include_router(billing_router)  # Prefix is defined in the router itself
app.include_router(sandbox_router, prefix="/api/sandbox", tags=["Sandbox"])

@app.get("/")
def root():
    resp = {"message": "Perioxia CRM API is running", "version": "1.0.0"}
    if not is_production:
        resp["docs"] = "/docs"
    return resp

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        logging.getLogger("health").exception("Health check DB probe failed")
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "database": "down"},
        )
    return {"status": "healthy", "database": "up"}
