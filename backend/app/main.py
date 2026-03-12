from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.routers import auth, users, leads, tasks, clients, admin, manager, follow_ups, md, purchase, ledgers, leaves, platform, invoices, export, search, notifications, timeline, bug_report
from app.config import settings
from app.middleware.security import SecurityHeadersMiddleware
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

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exception(type(exc), exc, exc.__traceback__)
    tb_str = ''.join(tb)
    logger.error(f"Unhandled error on {request.method} {request.url}:\n{tb_str}")
    # Don't expose internal errors in production
    detail = str(exc) if not is_production else "Internal server error"
    return JSONResponse(status_code=500, content={"detail": detail})


# Security Headers Middleware
app.add_middleware(SecurityHeadersMiddleware)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
    expose_headers=["Content-Disposition"],  # For CSV export downloads
)

# Include API routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(leads.router, prefix="/api/leads", tags=["Leads"])
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
app.include_router(platform.router, prefix="/platform", tags=["Platform"])
app.include_router(export.router, prefix="/api/export", tags=["Export"])
app.include_router(search.router, prefix="/api/search", tags=["Search"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(timeline.router, prefix="/api/timeline", tags=["Timeline"])
app.include_router(bug_report.router, prefix="/api/bug-report", tags=["Bug Reports"])

@app.get("/")
def root():
    resp = {"message": "CRM API is running", "version": "1.0.0"}
    if not is_production:
        resp["docs"] = "/docs"
    return resp

@app.get("/health")
def health_check():
    return {"status": "healthy"}
