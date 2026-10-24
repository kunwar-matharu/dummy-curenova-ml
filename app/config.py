import os
from pydantic import BaseModel

class Settings(BaseModel):
    APP_NAME: str = "CureNova 2.0"
    VERSION: str = "2.0.0"
    API_PREFIX: str = "/api"
    DEMO_MODE: bool = True  # Can be toggled at runtime via /api/system/mode
    SECRET_KEY: str = os.getenv("CURENOVA_SECRET_KEY", "curenova-biotech-research-secret-key-2026")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./curenova.db")
    
    # Public Biomedical API endpoints
    PUBMED_BASE_URL: str = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
    CHEMBL_BASE_URL: str = "https://www.ebi.ac.uk/chembl/api/data"
    CLINICALTRIALS_BASE_URL: str = "https://clinicaltrials.gov/api/v2"
    OPENFDA_BASE_URL: str = "https://api.fda.gov/drug"
    
    # Optional API keys (public APIs work without them within rate limits)
    NCBI_API_KEY: str | None = os.getenv("NCBI_API_KEY", None)
    OPENFDA_API_KEY: str | None = os.getenv("OPENFDA_API_KEY", None)

settings = Settings()
