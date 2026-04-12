from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from api import auth, websockets, ingest

app = FastAPI(title="AI Grid Optimization API")

# Configure CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For dev only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR, tags=["auth"])
app.include_router(ingest.router, prefix=settings.API_V1_STR, tags=["ingest"])
app.include_router(websockets.router, tags=["websockets"])

@app.get("/")
def read_root():
    return {"status": "AI Grid Optimization Backend is running."}
