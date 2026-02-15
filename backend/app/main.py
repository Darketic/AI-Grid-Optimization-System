from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.region_routes import router

app = FastAPI(title="AI Grid Optimization API")

# Enable CORS for React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get("/")
def root():
    return {"message": "AI Grid Optimization Backend Running"}
