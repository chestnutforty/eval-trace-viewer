from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .api import evals, samples, feedback

app = FastAPI(
    title="Eval Trace Viewer API",
    description="API for exploring evaluation traces and providing feedback",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(evals.router, prefix="/api/evals", tags=["evals"])
app.include_router(samples.router, prefix="/api/samples", tags=["samples"])
app.include_router(feedback.router, prefix="/api/feedback", tags=["feedback"])


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}
