import os
from pydantic import BaseModel, model_validator

INSECURE_EXAMPLE_KEYS = {
    "curenova-biotech-research-secret-key-2026-auth-jwt-min-32-chars",
    "curenova-biotech-research-secret-key-2026",
    "dev-insecure-jwt-signing-secret-key-min-32-chars",
    "replace_with_a_secure_high_entropy_secret_min_32_chars",
    "replace_with_a_secure_app_secret_key_min_32_chars",
    "your_jwt_secret_key_here_min_32_chars",
    "secret",
    "changeme",
    "password"
}

def _get_default_jwt_secret() -> str:
    secret = os.getenv("CURENOVA_JWT_SECRET")
    if secret:
        return secret
    if os.getenv("ENVIRONMENT", "development").lower() == "production":
        return ""
    return "dev-insecure-jwt-signing-secret-key-min-32-chars"

class Settings(BaseModel):
    APP_NAME: str = "CureNova 2.0"
    VERSION: str = "2.0.0"
    API_PREFIX: str = "/api"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development").lower()
    ENABLE_DEMO_SEEDING: bool = os.getenv(
        "ENABLE_DEMO_SEEDING",
        "true" if os.getenv("ENVIRONMENT", "development").lower() != "production" else "false"
    ).lower() in ("true", "1")
    DEMO_MODE: bool = True  # Can be toggled at runtime via /api/system/mode
    SECRET_KEY: str = os.getenv("CURENOVA_SECRET_KEY", "dev-insecure-app-secret-key-min-32-chars")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./curenova.db")

    # Authentication & Token Lifecycle Configuration
    JWT_SECRET_KEY: str = _get_default_jwt_secret()
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    JWT_ISSUER: str = "curenova-auth"
    JWT_AUDIENCE: str = "curenova-api"

    # Public Biomedical API endpoints
    PUBMED_BASE_URL: str = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
    CHEMBL_BASE_URL: str = "https://www.ebi.ac.uk/chembl/api/data"
    CLINICALTRIALS_BASE_URL: str = "https://clinicaltrials.gov/api/v2"
    OPENFDA_BASE_URL: str = "https://api.fda.gov/drug"
    
    # Optional API keys (public APIs work without them within rate limits)
    NCBI_API_KEY: str | None = os.getenv("NCBI_API_KEY", None)
    OPENFDA_API_KEY: str | None = os.getenv("OPENFDA_API_KEY", None)

    # LLM Provider Configuration
    LLM_BACKEND_ENABLED: bool = os.getenv("LLM_BACKEND_ENABLED", "false").lower() in ("true", "1")
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "openai").lower()
    LLM_BASE_URL: str = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gpt-4o-mini")
    LLM_API_KEY: str | None = os.getenv("LLM_API_KEY", None)
    LLM_TIMEOUT_SECONDS: float = float(os.getenv("LLM_TIMEOUT_SECONDS", "15.0"))
    PROMPT_VERSION: str = os.getenv("PROMPT_VERSION", "v2.5.0")

    # CORS Configuration
    CORS_ALLOWED_ORIGINS: str = os.getenv("CORS_ALLOWED_ORIGINS", "")

    def get_cors_origins(self) -> list[str]:
        """
        Parses and returns validated frontend origins.
        Fails closed in production if missing, malformed, or wildcard.
        """
        raw = (self.CORS_ALLOWED_ORIGINS or "").strip()
        if self.ENVIRONMENT == "production":
            if not raw:
                raise RuntimeError(
                    "FATAL CONFIGURATION ERROR: CORS_ALLOWED_ORIGINS is required in production mode. "
                    "Specify one or more comma-separated trusted frontend origins."
                )
            origins = [o.strip() for o in raw.split(",") if o.strip()]
            if not origins:
                raise RuntimeError(
                    "FATAL CONFIGURATION ERROR: CORS_ALLOWED_ORIGINS cannot be empty in production mode."
                )
            for origin in origins:
                if origin == "*":
                    raise RuntimeError(
                        "FATAL CONFIGURATION ERROR: Wildcard origin '*' is forbidden in production CORS configuration."
                    )
                if not self._is_valid_origin(origin):
                    raise RuntimeError(
                        f"FATAL CONFIGURATION ERROR: Malformed CORS origin '{origin}'. "
                        "Origins must be strict scheme://host[:port] with no path or query parameters."
                    )
            return origins
        else:
            # Development fallback
            if raw:
                origins = [o.strip() for o in raw.split(",") if o.strip()]
                # Reject wildcard if credentials are used
                if "*" in origins:
                    return ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]
                return origins
            return [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:3000",
                "http://127.0.0.1:3000"
            ]

    @staticmethod
    def _is_valid_origin(origin: str) -> bool:
        """Validates that a string is a strict origin with scheme and host, no path or query."""
        import re
        from urllib.parse import urlparse
        if not origin or origin == "*":
            return False
        parsed = urlparse(origin)
        if parsed.scheme not in ("http", "https"):
            return False
        if not parsed.netloc:
            return False
        if parsed.path and parsed.path != "":
            return False
        if parsed.query or parsed.fragment:
            return False
        # Ensure no trailing slashes or path characters
        origin_regex = re.compile(r"^https?://[a-zA-Z0-9\.\-]+(:[0-9]+)?$")
        return bool(origin_regex.match(origin))

    @model_validator(mode="after")
    def validate_production_configuration(self):
        """Enforces fail-closed security for production deployment."""
        if self.ENVIRONMENT == "production":
            secret = (self.JWT_SECRET_KEY or "").strip()
            if not secret or secret == "dev-insecure-jwt-signing-secret-key-min-32-chars":
                raise RuntimeError(
                    "FATAL CONFIGURATION ERROR: CURENOVA_JWT_SECRET is required in production mode "
                    "but was not provided. System startup failed closed."
                )
            if len(secret) < 32:
                raise RuntimeError(
                    f"FATAL CONFIGURATION ERROR: CURENOVA_JWT_SECRET must be at least 32 characters long "
                    f"(current length: {len(secret)}). System startup failed closed."
                )
            if secret in INSECURE_EXAMPLE_KEYS:
                raise RuntimeError(
                    "FATAL CONFIGURATION ERROR: CURENOVA_JWT_SECRET cannot use a known insecure example secret "
                    "in production mode. System startup failed closed."
                )
            if self.ENABLE_DEMO_SEEDING:
                raise RuntimeError(
                    "FATAL CONFIGURATION ERROR: ENABLE_DEMO_SEEDING cannot be enabled in production mode."
                )
            if secret == self.SECRET_KEY:
                raise RuntimeError(
                    "FATAL CONFIGURATION ERROR: CURENOVA_JWT_SECRET and CURENOVA_SECRET_KEY must not be identical. "
                    "Distinct high-entropy keys are required for application security and JWT token signing."
                )
            # Enforce CORS validation in production
            self.get_cors_origins()
        return self

settings = Settings()
