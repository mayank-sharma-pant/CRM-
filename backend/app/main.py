from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, users, leads, tasks, clients, admin, manager, follow_ups, md, purchase, ledgers, leaves, platform, invoices
from app.config import settings

app = FastAPI(
    title="CRM API",
    version="1.0.0",
    description="Professional CRM Backend API with FastAPI"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

@app.get("/")
def root():
    return {
        "message": "CRM API is running",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}
