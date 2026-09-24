from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import classify, extract, match, score, similarity

app = FastAPI(title="elevate-ml-service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(extract.router)
app.include_router(classify.router)
app.include_router(score.router)
app.include_router(similarity.router)
app.include_router(match.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "elevate-ml-service"}
