from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import engine, Base, SessionLocal
from .services.seed_data import seed_database
from .routers import (
    auth, candidates, stress_tests, graph,
    evidence, experiments, doctor, patient, reports, system
)

# Initialize database schema
Base.metadata.create_all(bind=engine)

# Seed database with initial verified biomedical data
db = SessionLocal()
try:
    seed_database(db)
finally:
    db.close()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="CureNova 2.0: Premium Agentic AI Drug-Repurposing Intelligence Platform"
)

# Enable CORS for frontend Vite development and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all API routers under settings.API_PREFIX ("/api")
app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(candidates.router, prefix=settings.API_PREFIX)
app.include_router(stress_tests.router, prefix=settings.API_PREFIX)
app.include_router(graph.router, prefix=settings.API_PREFIX)
app.include_router(evidence.router, prefix=settings.API_PREFIX)
app.include_router(experiments.router, prefix=settings.API_PREFIX)
app.include_router(doctor.router, prefix=settings.API_PREFIX)
app.include_router(patient.router, prefix=settings.API_PREFIX)
app.include_router(reports.router, prefix=settings.API_PREFIX)
app.include_router(system.router, prefix=settings.API_PREFIX)

@app.get("/")
def root():
    return {
        "platform": settings.APP_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs",
        "api_status": "healthy",
        "demo_mode": settings.DEMO_MODE
    }
