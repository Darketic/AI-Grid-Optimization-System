"""
main.py — FastAPI application entry point.
Registers all routers, CORS middleware, and a health-check endpoint.
"""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from api import auth, websockets, ingest, alerts, predict, stream

# ── Logging configuration ────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s — %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("grid_api")

# ── Application factory ───────────────────────────────────────────────────────
app = FastAPI(
    title="AI Grid Optimization API",
    description=(
        "Real-time electrical grid monitoring with LSTM load forecasting "
        "and Random Forest anomaly / theft detection."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS — allow the Vite dev server and any production origin ───────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # Tighten to your domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
# Auth & token management
app.include_router(auth.router,       prefix=settings.API_V1_STR, tags=["auth"])

# IoT data ingestion + circuit-trip simulation
app.include_router(ingest.router,     prefix=settings.API_V1_STR, tags=["ingest"])

# ML inference endpoints
app.include_router(predict.router,    prefix=settings.API_V1_STR, tags=["ml"])

# Alert history
app.include_router(alerts.router,     prefix=settings.API_V1_STR, tags=["alerts"])

# SSE streaming fallback
app.include_router(stream.router,     prefix=settings.API_V1_STR, tags=["stream"])

# WebSocket real-time channel (no prefix — connects at ws://host/ws)
app.include_router(websockets.router, tags=["websocket"])


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["health"])
def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "service": "AI Grid Optimization Backend",
    }


@app.get("/", tags=["health"])
def root():
    return {"message": "AI Grid Optimization API. See /docs for endpoints."}
