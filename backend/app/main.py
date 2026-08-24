from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import get_db
from app.routers.auth import auth
from app.routers.admin import users, admin, platform, notifications
from app.routers.sales import leads, tasks, clients, follow_ups, search, timeline
from app.routers.sales.deals import router as deals_router
from app.routers.finance import invoices, purchase, ledgers, export
from app.routers.ops import leaves, documents, bug_report, imports, inventory
from app.routers.management import md, manager
from app.routers.ai.company_assistant import router as company_ai_router
from app.routers import teams
from app.routers.billing import router as billing_router
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
    title="CRM API",
    version="1.0.0",
    description="Professional CRM Backend API with FastAPI",
    docs_url=None if is_production else "/docs",
    redoc_url=None if is_production else "/redoc",
)

from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=os.getenv("TRUSTED_HOSTS", "127.0.0.1").split(","))

from app.middleware.security import SecurityHeadersMiddleware
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

# Include API routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(leads.router, prefix="/api/leads", tags=["Leads"])
app.include_router(deals_router, prefix="/api/deals", tags=["Deals"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["Tasks"])
app.include_router(clients.router, prefix="/api/clients", tags=["Clients"])
app.include_router(follow_ups.router, prefix="/api/follow-ups", tags=["Follow-ups"])
app.include_router(manager.router, prefix="/api/manager", tags=["Manager"])
app.include_router(md.router, prefix="/api/md", tags=["Managing Director"])
app.include_router(purchase.router, prefix="/api/purchase", tags=["Purchase"])
app.include_router(invoices.router, prefix="/api/invoices", tags=["Invoices"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
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

@app.get("/")
def root():
    resp = {"message": "CRM API is running", "version": "1.0.0"}
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
