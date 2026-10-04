"""
Precipitation Rendering Functional Equivalence Analyzer - FastAPI Backend
Main entrypoint and API router configuration.
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database.session import init_database, SessionLocal
from .services.dataset_service import DatasetService
from .api.routes_health import router as health_router
from .api.routes_dataset import router as dataset_router
from .api.routes_compare import router as compare_router
from .api.routes_config import router as config_router
from .api.routes_reports import router as reports_router

from fastapi.responses import FileResponse

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data"))
MASKS_DIR = os.path.join(DATA_DIR, "masks")
FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../frontend/dist"))
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(MASKS_DIR, exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database and sync dataset
    init_database()
    with SessionLocal() as db:
        DatasetService.sync_dataset_to_db(db)
    yield
    # Shutdown

app = FastAPI(
    title="Precipitation Rendering Functional Equivalence Analyzer",
    description="Automated Computer-Vision Equivalence QA for Meteorological Radar Imagery",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount /data to serve raw images and generated masks
app.mount("/data", StaticFiles(directory=DATA_DIR), name="data")

# Register API Routers
app.include_router(health_router, prefix="/api")
app.include_router(dataset_router, prefix="/api")
app.include_router(compare_router, prefix="/api")
app.include_router(config_router, prefix="/api")
app.include_router(reports_router, prefix="/api")

# Mount SPA frontend dist if built
if os.path.exists(FRONTEND_DIST):
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Do not intercept /api or /data calls
        if full_path.startswith("api") or full_path.startswith("data"):
            return None
        target_path = os.path.join(FRONTEND_DIST, full_path)
        if full_path and os.path.exists(target_path) and os.path.isfile(target_path):
            return FileResponse(target_path)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

