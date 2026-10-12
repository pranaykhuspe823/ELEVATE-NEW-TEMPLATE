import hmac
import os
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from .routers import classify, extract, match, score, similarity


def _load_dotenv() -> None:
    """Minimal ml-service/.env reader (KEY=value lines), so no extra dependency.
    Real environment variables win over the file."""
    env_file = Path(__file__).resolve().parent.parent / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_dotenv()
SERVICE_KEY = os.environ.get("ML_SERVICE_KEY", "")

# Only the Elevate backend calls this service, server to server -- no CORS
# middleware, so browsers on other sites can't call it.
app = FastAPI(title="elevate-ml-service", docs_url=None, redoc_url=None, openapi_url=None)


@app.middleware("http")
async def require_service_key(request: Request, call_next):
    """Every route except /health needs the shared X-Service-Key header
    (backend/.env ML_SERVICE_KEY must match ml-service/.env ML_SERVICE_KEY)."""
    if request.url.path != "/health":
        if not SERVICE_KEY:
            return JSONResponse({"detail": "ML_SERVICE_KEY is not configured."}, status_code=503)
        provided = request.headers.get("x-service-key", "")
        if not hmac.compare_digest(provided.encode(), SERVICE_KEY.encode()):
            return JSONResponse({"detail": "Invalid or missing service key."}, status_code=401)
    return await call_next(request)


app.include_router(extract.router)
app.include_router(classify.router)
app.include_router(score.router)
app.include_router(similarity.router)
app.include_router(match.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "elevate-ml-service"}
