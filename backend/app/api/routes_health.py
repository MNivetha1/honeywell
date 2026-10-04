"""
Health and System Telemetry Endpoints
"""

import sys
import os
import cv2
import numpy as np
import skimage
import fastapi
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from ..database.session import get_db, DB_PATH
from ..database.models import ImagePairModel, ComparisonModel
from ..schemas.system import HealthResponse, SystemInfoResponse
from ..cv.radar_data_adapter import RadarDataAdapter

router = APIRouter(tags=["System & Health"])

@router.get("/health", response_model=HealthResponse)
def get_system_health(db: Session = Depends(get_db)):
    """Validates operational readiness of backend, SQLite database, and CV engine."""
    db_connected = False
    try:
        db.execute(text("SELECT 1"))
        db_connected = True
    except Exception:
        db_connected = False

    cv_ready = True
    try:
        test_mat = np.zeros((10, 10, 3), dtype=np.uint8)
        _ = cv2.cvtColor(test_mat, cv2.COLOR_RGB2GRAY)
    except Exception:
        cv_ready = False

    status_str = "healthy" if (db_connected and cv_ready) else "degraded"

    return HealthResponse(
        status=status_str,
        backend_connected=True,
        database_connected=db_connected,
        cv_engine_ready=cv_ready,
        version="1.0.0",
        timestamp=datetime.utcnow()
    )

@router.get("/system/info", response_model=SystemInfoResponse)
def get_system_info(db: Session = Depends(get_db)):
    """Returns technical versions, runtime telemetry, and database statistics."""
    pairs_count = db.query(ImagePairModel).count()
    comp_count = db.query(ComparisonModel).count()
    db_status = "Connected (SQLite WAL)" if os.path.exists(DB_PATH) else "Initializing"

    return SystemInfoResponse(
        application_name="Precipitation Rendering Functional Equivalence Analyzer",
        application_version="1.0.0",
        python_version=f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        opencv_version=cv2.__version__,
        numpy_version=np.__version__,
        scikit_image_version=skimage.__version__,
        fastapi_version=fastapi.__version__,
        database_path=DB_PATH,
        database_status=db_status,
        dataset_pairs_count=pairs_count,
        comparisons_count=comp_count,
        radar_adapter_ready=True,
        system_time=datetime.utcnow()
    )
