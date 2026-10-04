"""
Pydantic schemas for System Status and Reports
"""

from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from datetime import datetime

class HealthResponse(BaseModel):
    status: str
    backend_connected: bool
    database_connected: bool
    cv_engine_ready: bool
    version: str
    timestamp: datetime

class SystemInfoResponse(BaseModel):
    application_name: str
    application_version: str
    python_version: str
    opencv_version: str
    numpy_version: str
    scikit_image_version: str
    fastapi_version: str
    database_path: str
    database_status: str
    dataset_pairs_count: int
    comparisons_count: int
    radar_adapter_ready: bool
    system_time: datetime

class ReportSummary(BaseModel):
    total_evaluated: int
    pass_count: int
    fail_count: int
    pass_rate: float
    average_similarity: float
    threshold_used: float
    generated_at: datetime
    constraints_summary: Dict[str, bool]
